begin;
alter table public.users add column if not exists avatar_path text;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-icons', 'profile-icons', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users upload own profile icons" on storage.objects;
create policy "Users upload own profile icons" on storage.objects for insert to authenticated
with check(bucket_id='profile-icons' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users read own profile icons" on storage.objects;
create policy "Users read own profile icons" on storage.objects for select to authenticated
using(bucket_id='profile-icons' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users delete own profile icons" on storage.objects;
create policy "Users delete own profile icons" on storage.objects for delete to authenticated
using(bucket_id='profile-icons' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.update_own_profile(p_name text, p_avatar_path text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'ログインしてください。'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 100 then
    raise exception '名前は1〜100文字で入力してください。';
  end if;
  if p_avatar_path is not null then
    if split_part(p_avatar_path,'/',1) <> auth.uid()::text or not exists (
      select 1 from storage.objects where bucket_id='profile-icons' and name=p_avatar_path
    ) then raise exception '自分でアップロードしたアイコンを選択してください。'; end if;
  end if;
  update public.users set name=btrim(p_name), avatar_path=p_avatar_path, updated_at=now()
  where id=auth.uid();
  if not found then raise exception 'プロフィールが見つかりません。'; end if;
end;
$$;
revoke all on function public.update_own_profile(text,text) from public;
grant execute on function public.update_own_profile(text,text) to authenticated;
commit;
