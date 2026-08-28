-- 既にキャラクター版を適用済みの環境を、セリフ画像版へ移行する差分
alter table public.voice_lines
  add column if not exists image_url text,
  add column if not exists image_storage_path text;

alter table public.voice_lines
  drop constraint if exists voice_lines_character_id_fkey;

alter table public.voice_lines
  drop column if exists character_id;

drop table if exists public.voice_characters;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-line-images',
  'voice-line-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone views line images" on storage.objects;
create policy "Anyone views line images" on storage.objects for select
using (bucket_id = 'voice-line-images');

drop policy if exists "Admins upload line images" on storage.objects;
create policy "Admins upload line images" on storage.objects for insert to authenticated
with check (bucket_id = 'voice-line-images' and public.is_global_admin());

drop policy if exists "Admins delete line images" on storage.objects;
create policy "Admins delete line images" on storage.objects for delete to authenticated
using (bucket_id = 'voice-line-images' and public.is_global_admin());
