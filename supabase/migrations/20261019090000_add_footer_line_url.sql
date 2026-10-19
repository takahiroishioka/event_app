alter table public.footer_settings
  add column if not exists line_url text
  constraint footer_settings_line_url_http check (line_url is null or line_url ~* '^https?://');

-- Keep the existing admin-only UPDATE policy; grant access to the new column.
grant update (line_url) on public.footer_settings to authenticated;
