create table if not exists public.guest_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 100),
  status text not null default 'reserved' check (status in ('reserved', 'waiting', 'joined', 'cancelled', 'noshow')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_event_answers (
  id uuid primary key default gen_random_uuid(),
  guest_registration_id uuid not null references public.guest_event_registrations(id) on delete cascade,
  question_id uuid not null references public.event_questions(id) on delete cascade,
  answer_text text not null,
  created_at timestamptz not null default now(),
  unique (guest_registration_id, question_id)
);

alter table public.guest_event_registrations enable row level security;
alter table public.guest_event_answers enable row level security;

grant select, update on public.guest_event_registrations to authenticated;
grant select on public.guest_event_answers to authenticated;

create policy "Event managers can view guest registrations"
on public.guest_event_registrations for select to authenticated
using (public.can_manage_event(event_id, false));

create policy "Event editors can update guest registrations"
on public.guest_event_registrations for update to authenticated
using (public.can_manage_event(event_id, true))
with check (public.can_manage_event(event_id, true));

create policy "Event managers can view guest answers"
on public.guest_event_answers for select to authenticated
using (exists (
  select 1 from public.guest_event_registrations registration
  where registration.id = guest_registration_id
    and public.can_manage_event(registration.event_id, false)
));

create or replace function public.submit_guest_event_application(
  p_event_id uuid,
  p_guest_name text,
  p_answers jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_id uuid;
  v_status text;
  v_capacity integer;
  v_active_count integer;
  v_question record;
  v_answer jsonb;
begin
  if char_length(btrim(coalesce(p_guest_name, ''))) not between 1 and 100 then
    raise exception 'お名前を入力してください。';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception '回答形式が正しくありません。';
  end if;

  select capacity into v_capacity
  from public.events
  where id = p_event_id and status = 'published';

  if not found then
    raise exception '現在、このイベントには参加できません。';
  end if;

  for v_question in
    select id, is_required from public.event_questions where event_id = p_event_id
  loop
    v_answer := p_answers -> v_question.id::text;
    if v_question.is_required and (
      v_answer is null or v_answer = 'null'::jsonb or
      (jsonb_typeof(v_answer) = 'string' and btrim(v_answer #>> '{}') = '') or
      (jsonb_typeof(v_answer) = 'array' and jsonb_array_length(v_answer) = 0)
    ) then
      raise exception '必須の質問に回答してください。';
    end if;
  end loop;

  select
    (select count(*) from public.user_events where event_id = p_event_id and status in ('reserved','joined')) +
    (select count(*) from public.guest_event_registrations where event_id = p_event_id and status in ('reserved','joined'))
  into v_active_count;

  v_status := case when v_capacity is not null and v_active_count >= v_capacity then 'waiting' else 'reserved' end;

  insert into public.guest_event_registrations(event_id, guest_name, status)
  values (p_event_id, btrim(p_guest_name), v_status)
  returning id into v_registration_id;

  insert into public.guest_event_answers(guest_registration_id, question_id, answer_text)
  select v_registration_id, question.id,
    case when jsonb_typeof(p_answers -> question.id::text) = 'string'
      then p_answers ->> question.id::text
      else (p_answers -> question.id::text)::text
    end
  from public.event_questions question
  where question.event_id = p_event_id
    and p_answers ? question.id::text
    and p_answers -> question.id::text <> 'null'::jsonb;

  return v_registration_id;
end;
$$;

revoke all on function public.submit_guest_event_application(uuid, text, jsonb) from public;
grant execute on function public.submit_guest_event_application(uuid, text, jsonb) to anon, authenticated;