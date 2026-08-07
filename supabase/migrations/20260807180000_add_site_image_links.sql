alter table public.site_images
  add column if not exists link_url text;

grant update (link_url, updated_at)
on public.site_images
to authenticated;
