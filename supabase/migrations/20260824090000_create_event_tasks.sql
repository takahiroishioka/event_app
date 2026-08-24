create table if not exists public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  details text,
  due_at timestamptz,
  assignee_user_id uuid references public.users(id) on delete set null,
  completion_message text,
  completed_at timestamptz,
  completed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_tasks_event_due_idx
  on public.event_tasks (event_id, completed_at, due_at);

alter table public.event_tasks enable row level security;
grant select, insert, update, delete on public.event_tasks to authenticated;

create policy "Event managers can view tasks" on public.event_tasks for select to authenticated
using (public.can_manage_event(event_id, false));

create policy "Event editors can create tasks" on public.event_tasks for insert to authenticated
with check (public.can_manage_event(event_id, true));

create policy "Event editors can update tasks" on public.event_tasks for update to authenticated
using (public.can_manage_event(event_id, true))
with check (public.can_manage_event(event_id, true));

create policy "Event editors can delete tasks" on public.event_tasks for delete to authenticated
using (public.can_manage_event(event_id, true));

create or replace function public.get_event_task_assignees(p_event_id uuid)
returns table (user_id uuid, name text, email text)
language sql stable security definer set search_path = public
as $$
  select distinct u.id, coalesce(u.name, '名前未登録'), u.email
  from public.users u
  where public.can_manage_event(p_event_id, false)
    and (
      exists (
        select 1 from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = u.id and r.name = 'admin'
      )
      or exists (
        select 1 from public.event_managers em
        where em.event_id = p_event_id and em.user_id = u.id
      )
    )
  order by coalesce(u.name, '名前未登録'), u.email;
$$;

create or replace function public.complete_event_task(p_task_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_task public.event_tasks%rowtype;
begin
  select * into v_task from public.event_tasks where id = p_task_id;
  if v_task.id is null then raise exception 'タスクが見つかりません'; end if;
  if not public.can_manage_event(v_task.event_id, false) then
    raise exception 'このイベントの管理権限がありません';
  end if;
  if not public.is_global_admin() and v_task.assignee_user_id is distinct from auth.uid() then
    raise exception 'このタスクの完了権限がありません';
  end if;
  update public.event_tasks
  set completed_at = coalesce(completed_at, now()),
      completed_by = coalesce(completed_by, auth.uid()),
      updated_at = now()
  where id = p_task_id;
end;
$$;

revoke all on function public.get_event_task_assignees(uuid) from public;
revoke all on function public.complete_event_task(uuid) from public;
grant execute on function public.get_event_task_assignees(uuid) to authenticated;
grant execute on function public.complete_event_task(uuid) to authenticated;
