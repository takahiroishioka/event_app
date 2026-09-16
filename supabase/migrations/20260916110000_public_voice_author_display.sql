begin;

create or replace function public.get_public_voice_authors(p_line_id uuid)
returns table (id uuid, name text, avatar_path text)
language sql stable security definer set search_path = public
as '
  select u.id, u.name::text, u.avatar_path
  from public.users u
  where exists (
    select 1 from public.voice_posts p
    join public.voice_lines l on l.id = p.line_id
    where p.user_id = u.id and l.id = p_line_id and l.status = ''published''
  );
';
revoke all on function public.get_public_voice_authors(uuid) from public;
grant execute on function public.get_public_voice_authors(uuid) to anon, authenticated;

create or replace function public.get_public_voice_profile(p_user_id uuid)
returns table (id uuid, name text, bio text, avatar_path text)
language sql stable security definer set search_path = public
as '
  select u.id, u.name::text, u.bio, u.avatar_path
  from public.users u where u.id = p_user_id;
';
revoke all on function public.get_public_voice_profile(uuid) from public;
grant execute on function public.get_public_voice_profile(uuid) to anon, authenticated;

commit;
