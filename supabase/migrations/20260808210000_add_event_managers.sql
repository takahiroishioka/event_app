create table if not exists public.event_managers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_managers enable row level security;
grant select, insert, update, delete on public.event_managers to authenticated;
grant select on public.events, public.users, public.user_events, public.event_questions,
  public.event_question_options, public.user_event_answers, public.payments, public.site_images to authenticated;
grant update on public.events, public.user_events, public.payments, public.site_images to authenticated;
grant insert, delete on public.site_images to authenticated;
grant insert, update, delete on public.event_questions, public.event_question_options to authenticated;

create or replace function public.is_global_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  );
$$;

create or replace function public.can_manage_event(p_event_id uuid, p_edit_required boolean default false)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_global_admin() or exists (
    select 1 from public.event_managers em
    where em.event_id = p_event_id and em.user_id = auth.uid()
      and (not p_edit_required or em.role = 'editor')
  );
$$;

revoke all on function public.is_global_admin() from public;
revoke all on function public.can_manage_event(uuid, boolean) from public;
grant execute on function public.is_global_admin() to authenticated;
grant execute on function public.can_manage_event(uuid, boolean) to authenticated;

create policy "Event managers can view manager list" on public.event_managers for select
using (public.can_manage_event(event_id, false));
create policy "Admins can add event managers" on public.event_managers for insert
with check (public.is_global_admin());
create policy "Admins can update event managers" on public.event_managers for update
using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Admins can delete event managers" on public.event_managers for delete
using (public.is_global_admin());

create policy "Event managers can view assigned events" on public.events for select
using (public.can_manage_event(id, false));
create policy "Event editors can update assigned events" on public.events for update
using (public.can_manage_event(id, true)) with check (public.can_manage_event(id, true));

create policy "Event managers can view assigned event images" on public.site_images for select
using (placement = 'event' and event_id is not null and public.can_manage_event(event_id, false));
create policy "Event editors can add assigned event images" on public.site_images for insert
with check (placement = 'event' and event_id is not null and public.can_manage_event(event_id, true));
create policy "Event editors can update assigned event images" on public.site_images for update
using (placement = 'event' and event_id is not null and public.can_manage_event(event_id, true))
with check (placement = 'event' and event_id is not null and public.can_manage_event(event_id, true));
create policy "Event editors can delete assigned event images" on public.site_images for delete
using (placement = 'event' and event_id is not null and public.can_manage_event(event_id, true));

create policy "Event editors can upload assigned event files" on storage.objects for insert to authenticated
with check (bucket_id = 'event-images' and exists (
  select 1 from public.event_managers em
  where em.user_id = auth.uid() and em.role = 'editor'
    and name like ('site-images/event/' || em.event_id::text || '/%')
));

create policy "Event managers can view registrations" on public.user_events for select
using (public.can_manage_event(event_id, false));
create policy "Event editors can update registrations" on public.user_events for update
using (public.can_manage_event(event_id, true)) with check (public.can_manage_event(event_id, true));

create policy "Event managers can view questions" on public.event_questions for select
using (public.can_manage_event(event_id, false));
create policy "Event editors can manage questions" on public.event_questions for all
using (public.can_manage_event(event_id, true)) with check (public.can_manage_event(event_id, true));

create policy "Event managers can view question options" on public.event_question_options for select
using (exists (select 1 from public.event_questions q where q.id = question_id and public.can_manage_event(q.event_id, false)));
create policy "Event editors can manage question options" on public.event_question_options for all
using (exists (select 1 from public.event_questions q where q.id = question_id and public.can_manage_event(q.event_id, true)))
with check (exists (select 1 from public.event_questions q where q.id = question_id and public.can_manage_event(q.event_id, true)));

create policy "Event managers can view answers" on public.user_event_answers for select
using (exists (select 1 from public.user_events ue where ue.id = user_event_id and public.can_manage_event(ue.event_id, false)));

create policy "Event managers can view payments" on public.payments for select
using (exists (select 1 from public.user_events ue where ue.id = user_event_id and public.can_manage_event(ue.event_id, false)));
create policy "Event editors can update payments" on public.payments for update
using (exists (select 1 from public.user_events ue where ue.id = user_event_id and public.can_manage_event(ue.event_id, true)))
with check (exists (select 1 from public.user_events ue where ue.id = user_event_id and public.can_manage_event(ue.event_id, true)));

create policy "Event managers can view participant profiles" on public.users for select
using (public.is_global_admin() or exists (
  select 1 from public.user_events ue
  where ue.user_id = users.id and public.can_manage_event(ue.event_id, false)
) or exists (
  select 1 from public.event_managers em
  where em.user_id = users.id and public.can_manage_event(em.event_id, false)
));

create or replace function public.set_event_manager(p_event_id uuid, p_email text, p_role text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_user_id uuid;
begin
  if not public.is_global_admin() then raise exception '管理者権限が必要です'; end if;
  if p_role not in ('editor', 'viewer') then raise exception '権限が不正です'; end if;
  select id into v_user_id from public.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then raise exception 'このメールアドレスのユーザーが見つかりません'; end if;
  insert into public.event_managers (event_id, user_id, role)
  values (p_event_id, v_user_id, p_role)
  on conflict (event_id, user_id) do update set role = excluded.role, updated_at = now();
end;
$$;

revoke all on function public.set_event_manager(uuid, text, text) from public;
grant execute on function public.set_event_manager(uuid, text, text) to authenticated;
