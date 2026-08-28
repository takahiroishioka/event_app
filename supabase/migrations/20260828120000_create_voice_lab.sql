-- こえらぼ: 既存Auth・users・管理者ロールを共有する音声投稿機能
alter table public.users add column if not exists bio text;

create table if not exists public.voice_characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_lines (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.voice_characters(id) on delete restrict,
  title text not null,
  body text not null,
  direction text,
  category text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_posts (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.voice_lines(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  audio_url text not null,
  storage_path text not null unique,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_likes (
  voice_post_id uuid not null references public.voice_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (voice_post_id, user_id)
);

create table if not exists public.voice_comments (
  id uuid primary key default gen_random_uuid(),
  voice_post_id uuid not null references public.voice_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_lines_public_idx on public.voice_lines (status, published_at desc);
create index if not exists voice_posts_line_idx on public.voice_posts (line_id, created_at desc);
create index if not exists voice_posts_user_idx on public.voice_posts (user_id, created_at desc);
create index if not exists voice_comments_post_idx on public.voice_comments (voice_post_id, created_at);

alter table public.voice_characters enable row level security;
alter table public.voice_lines enable row level security;
alter table public.voice_posts enable row level security;
alter table public.voice_likes enable row level security;
alter table public.voice_comments enable row level security;

grant select on public.voice_characters, public.voice_lines, public.voice_posts, public.voice_likes, public.voice_comments to anon, authenticated;
grant insert, update, delete on public.voice_characters, public.voice_lines to authenticated;
grant insert, update, delete on public.voice_posts, public.voice_likes, public.voice_comments to authenticated;
grant update (bio, updated_at) on public.users to authenticated;

create policy "Anyone can view active voice characters" on public.voice_characters for select
using (is_active or public.is_global_admin());
create policy "Admins manage voice characters" on public.voice_characters for all to authenticated
using (public.is_global_admin()) with check (public.is_global_admin());

create policy "Anyone can view published voice lines" on public.voice_lines for select
using (status = 'published' or public.is_global_admin());
create policy "Admins manage voice lines" on public.voice_lines for all to authenticated
using (public.is_global_admin()) with check (public.is_global_admin());

create policy "Anyone can view voice posts" on public.voice_posts for select using (true);
create policy "Users create own voice posts" on public.voice_posts for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.voice_lines l where l.id = line_id and l.status = 'published'));
create policy "Users update own voice posts" on public.voice_posts for update to authenticated
using (user_id = auth.uid() or public.is_global_admin()) with check (user_id = auth.uid() or public.is_global_admin());
create policy "Users delete own voice posts" on public.voice_posts for delete to authenticated
using (user_id = auth.uid() or public.is_global_admin());

create policy "Anyone can view voice likes" on public.voice_likes for select using (true);
create policy "Users create own voice likes" on public.voice_likes for insert to authenticated with check (user_id = auth.uid());
create policy "Users delete own voice likes" on public.voice_likes for delete to authenticated using (user_id = auth.uid());

create policy "Anyone can view voice comments" on public.voice_comments for select using (true);
create policy "Users create own voice comments" on public.voice_comments for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own voice comments" on public.voice_comments for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own voice comments" on public.voice_comments for delete to authenticated
using (user_id = auth.uid() or public.is_global_admin());

drop policy if exists "Users can update own voice profile" on public.users;
create policy "Users can update own voice profile" on public.users for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-recordings', 'voice-recordings', true, 20971520, array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm','audio/ogg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can play voice recordings" on storage.objects for select
using (bucket_id = 'voice-recordings');
create policy "Users upload own voice recordings" on storage.objects for insert to authenticated
with check (bucket_id = 'voice-recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own voice recordings" on storage.objects for delete to authenticated
using (bucket_id = 'voice-recordings' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_global_admin()));
