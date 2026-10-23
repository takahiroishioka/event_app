alter table public.top_page_settings
  add column if not exists hero_youtube_url text;

grant update (hero_youtube_url) on public.top_page_settings to authenticated;
-- Existing admin-only RLS policies still apply. Existing title/body stay unchanged.
