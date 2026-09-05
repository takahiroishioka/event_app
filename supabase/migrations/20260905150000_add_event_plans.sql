create table if not exists public.event_plans (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100), description text,
  fee integer not null default 0 check (fee >= 0), capacity integer check (capacity is null or capacity > 0),
  sort_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.event_plans enable row level security;
alter table public.user_events add column if not exists plan_id uuid references public.event_plans(id) on delete set null;
alter table public.guest_event_registrations add column if not exists plan_id uuid references public.event_plans(id) on delete set null;
create index if not exists event_plans_event_id_idx on public.event_plans(event_id, sort_order);
create index if not exists user_events_plan_id_idx on public.user_events(plan_id);
create index if not exists guest_event_registrations_plan_id_idx on public.guest_event_registrations(plan_id);
grant select on public.event_plans to anon, authenticated;
grant insert, update, delete on public.event_plans to authenticated;
grant update(plan_id) on public.user_events to authenticated;
create policy "Anyone can view active plans" on public.event_plans for select using (is_active or public.can_manage_event(event_id, false));
create policy "Event editors can add plans" on public.event_plans for insert to authenticated with check (public.can_manage_event(event_id, true));
create policy "Event editors can update plans" on public.event_plans for update to authenticated using (public.can_manage_event(event_id, true)) with check (public.can_manage_event(event_id, true));
create policy "Event editors can delete plans" on public.event_plans for delete to authenticated using (public.can_manage_event(event_id, true));

create or replace function public.submit_guest_event_application(p_event_id uuid, p_guest_name text, p_answers jsonb default '{}'::jsonb, p_plan_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_status text; v_capacity integer; v_count integer; v_question record; v_answer jsonb; v_has_plans boolean;
begin
 if char_length(btrim(coalesce(p_guest_name,''))) not between 1 and 100 then raise exception 'お名前を入力してください。'; end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'object' then raise exception '回答形式が正しくありません。'; end if;
 if not exists(select 1 from public.events where id=p_event_id and status='published') then raise exception '現在、このイベントには参加できません。'; end if;
 select exists(select 1 from public.event_plans where event_id=p_event_id and is_active) into v_has_plans;
 if v_has_plans and p_plan_id is null then raise exception 'プランを選択してください。'; end if;
 if p_plan_id is not null then
   select capacity into v_capacity from public.event_plans where id=p_plan_id and event_id=p_event_id and is_active;
   if not found then raise exception '選択したプランは利用できません。'; end if;
 else select capacity into v_capacity from public.events where id=p_event_id;
 end if;
 for v_question in select id,is_required from public.event_questions where event_id=p_event_id loop
   v_answer:=p_answers->v_question.id::text;
   if v_question.is_required and (v_answer is null or v_answer='null'::jsonb or (jsonb_typeof(v_answer)='string' and btrim(v_answer#>>'{}')='') or (jsonb_typeof(v_answer)='array' and jsonb_array_length(v_answer)=0)) then raise exception '必須の質問に回答してください。'; end if;
 end loop;
 if p_plan_id is null then
   select (select count(*) from public.user_events where event_id=p_event_id and plan_id is null and status in('reserved','joined'))+(select count(*) from public.guest_event_registrations where event_id=p_event_id and plan_id is null and status in('reserved','joined')) into v_count;
 else
   select (select count(*) from public.user_events where plan_id=p_plan_id and status in('reserved','joined'))+(select count(*) from public.guest_event_registrations where plan_id=p_plan_id and status in('reserved','joined')) into v_count;
 end if;
 v_status:=case when v_capacity is not null and v_count>=v_capacity then 'waiting' else 'reserved' end;
 insert into public.guest_event_registrations(event_id,guest_name,status,plan_id) values(p_event_id,btrim(p_guest_name),v_status,p_plan_id) returning id into v_id;
 insert into public.guest_event_answers(guest_registration_id,question_id,answer_text)
 select v_id,q.id,case when jsonb_typeof(p_answers->q.id::text)='string' then p_answers->>q.id::text else (p_answers->q.id::text)::text end from public.event_questions q where q.event_id=p_event_id and p_answers?q.id::text and p_answers->q.id::text<>'null'::jsonb;
 return v_id;
end $$;
revoke all on function public.submit_guest_event_application(uuid,text,jsonb,uuid) from public;
grant execute on function public.submit_guest_event_application(uuid,text,jsonb,uuid) to anon, authenticated;
create or replace function public.set_event_plan_registration_status()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_capacity integer; v_count integer;
begin
  if new.plan_id is null or new.status not in ('reserved','waiting') then return new; end if;
  select capacity into v_capacity from public.event_plans where id=new.plan_id and event_id=new.event_id and is_active;
  if not found then raise exception '選択したプランは利用できません。'; end if;
  if tg_table_name='user_events' then
    select (select count(*) from public.user_events where plan_id=new.plan_id and id<>new.id and status in('reserved','joined'))+(select count(*) from public.guest_event_registrations where plan_id=new.plan_id and status in('reserved','joined')) into v_count;
  else
    select (select count(*) from public.user_events where plan_id=new.plan_id and status in('reserved','joined'))+(select count(*) from public.guest_event_registrations where plan_id=new.plan_id and id<>new.id and status in('reserved','joined')) into v_count;
  end if;
  new.status:=case when v_capacity is not null and v_count>=v_capacity then 'waiting' else 'reserved' end;
  return new;
end $$;
drop trigger if exists set_user_event_plan_status on public.user_events;
create trigger set_user_event_plan_status before insert or update of plan_id,status on public.user_events for each row execute function public.set_event_plan_registration_status();
drop trigger if exists set_guest_event_plan_status on public.guest_event_registrations;
create trigger set_guest_event_plan_status before insert or update of plan_id,status on public.guest_event_registrations for each row execute function public.set_event_plan_registration_status();

drop policy if exists "Users can insert own payments" on public.payments;
drop policy if exists "Users can update own pending payments" on public.payments;
create policy "Users can insert own payments" on public.payments for insert to authenticated with check (
 status='pending' and exists(select 1 from public.user_events ue join public.events e on e.id=ue.event_id left join public.event_plans ep on ep.id=ue.plan_id where ue.id=payments.user_event_id and ue.user_id=auth.uid() and ue.status in('reserved','joined') and payments.amount=coalesce(ep.fee,e.fee) and ((coalesce(ep.fee,e.fee)=0 and payments.method='free') or (coalesce(ep.fee,e.fee)>0 and payments.method in('cash','bank') and (coalesce(ep.fee,e.fee)>=1000 or payments.method='cash'))))
);
create policy "Users can update own pending payments" on public.payments for update to authenticated using(status='pending' and exists(select 1 from public.user_events ue where ue.id=payments.user_event_id and ue.user_id=auth.uid())) with check (
 status in('pending','confirmation_requested') and exists(select 1 from public.user_events ue join public.events e on e.id=ue.event_id left join public.event_plans ep on ep.id=ue.plan_id where ue.id=payments.user_event_id and ue.user_id=auth.uid() and ue.status in('reserved','joined') and payments.amount=coalesce(ep.fee,e.fee) and ((coalesce(ep.fee,e.fee)=0 and payments.status='pending' and payments.method='free') or (coalesce(ep.fee,e.fee)>0 and payments.method in('cash','bank') and (coalesce(ep.fee,e.fee)>=1000 or payments.method='cash'))))
);