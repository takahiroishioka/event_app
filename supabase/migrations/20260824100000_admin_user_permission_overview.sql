create or replace function public.get_user_permission_overview()
returns table (
  user_id uuid,
  name text,
  email text,
  is_admin boolean,
  is_ubm boolean
)
language sql stable security definer set search_path = public
as $$
  select
    u.id,
    coalesce(u.name, '名前未登録'),
    u.email,
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = u.id and r.name = 'admin'
    ),
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = u.id and r.name = 'ubm'
    )
  from public.users u
  where public.is_global_admin()
  order by coalesce(u.name, '名前未登録'), u.email;
$$;

revoke all on function public.get_user_permission_overview() from public;
grant execute on function public.get_user_permission_overview() to authenticated;
