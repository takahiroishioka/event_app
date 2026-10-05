alter table public.voice_lines
  add column if not exists youtube_url text;
