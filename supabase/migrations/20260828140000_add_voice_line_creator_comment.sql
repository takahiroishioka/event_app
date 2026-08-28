alter table public.voice_lines
  add column if not exists creator_comment text;
