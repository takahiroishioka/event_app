create or replace function public.register_current_user_as_ubm()
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  select id into v_role_id from public.roles where name = 'ubm';
  if v_role_id is null then
    raise exception 'UBMロールが見つかりません';
  end if;

  insert into public.user_roles (user_id, role_id)
  values (auth.uid(), v_role_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.register_current_user_as_ubm() from public;
grant execute on function public.register_current_user_as_ubm() to authenticated;
