alter table public.events
  add column if not exists is_ubm boolean not null default false;

insert into public.roles (name)
values ('ubm')
on conflict (name) do nothing;

create or replace function public.is_ubm_restricted_user()
returns boolean language sql stable security definer set search_path = public
as $$
  select
    not public.is_global_admin()
    and exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'ubm'
    );
$$;

create or replace function public.is_ubm_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select e.is_ubm from public.events e where e.id = p_event_id), false);
$$;

revoke all on function public.is_ubm_restricted_user() from public;
revoke all on function public.is_ubm_event(uuid) from public;
grant execute on function public.is_ubm_restricted_user() to authenticated;
grant execute on function public.is_ubm_event(uuid) to authenticated;

drop policy if exists "UBM users can only view UBM events" on public.events;
create policy "UBM users can only view UBM events"
  on public.events as restrictive for select to authenticated
  using (not public.is_ubm_restricted_user() or is_ubm);

drop policy if exists "UBM users can only view UBM registrations" on public.user_events;
create policy "UBM users can only view UBM registrations"
  on public.user_events as restrictive for select to authenticated
  using (not public.is_ubm_restricted_user() or public.is_ubm_event(event_id));

drop policy if exists "UBM users can only create UBM registrations" on public.user_events;
create policy "UBM users can only create UBM registrations"
  on public.user_events as restrictive for insert to authenticated
  with check (not public.is_ubm_restricted_user() or public.is_ubm_event(event_id));

drop policy if exists "UBM users can only update UBM registrations" on public.user_events;
create policy "UBM users can only update UBM registrations"
  on public.user_events as restrictive for update to authenticated
  using (not public.is_ubm_restricted_user() or public.is_ubm_event(event_id))
  with check (not public.is_ubm_restricted_user() or public.is_ubm_event(event_id));

create or replace function public.enforce_ubm_registration_access()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.is_ubm_restricted_user() and not public.is_ubm_event(new.event_id) then
    raise exception 'UBM権限ではこのイベントに申し込めません';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_ubm_registration_access on public.user_events;
create trigger enforce_ubm_registration_access
  before insert or update of event_id on public.user_events
  for each row execute function public.enforce_ubm_registration_access();

create or replace function public.set_ubm_user(p_email text, p_enabled boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_role_id uuid;
begin
  if not public.is_global_admin() then
    raise exception '管理者権限が必要です';
  end if;

  select id into v_user_id
  from public.users
  where lower(email) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'このメールアドレスのユーザーが見つかりません';
  end if;

  select id into v_role_id from public.roles where name = 'ubm';

  if p_enabled then
    insert into public.user_roles (user_id, role_id)
    values (v_user_id, v_role_id)
    on conflict do nothing;
  else
    delete from public.user_roles
    where user_id = v_user_id and role_id = v_role_id;
  end if;
end;
$$;

revoke all on function public.set_ubm_user(text, boolean) from public;
grant execute on function public.set_ubm_user(text, boolean) to authenticated;

create or replace function public.upgrade_from_ubm()
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from public.user_roles ur
  using public.roles r
  where ur.role_id = r.id
    and ur.user_id = auth.uid()
    and r.name = 'ubm';
end;
$$;

revoke all on function public.upgrade_from_ubm() from public;
grant execute on function public.upgrade_from_ubm() to authenticated;
