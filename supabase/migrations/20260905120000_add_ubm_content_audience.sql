alter table public.site_images
  add column if not exists audience text not null default 'all';

alter table public.site_images
  drop constraint if exists site_images_audience_check;

alter table public.site_images
  add constraint site_images_audience_check
  check (audience in ('all', 'general', 'ubm'));

alter table public.banners
  add column if not exists audience text not null default 'all';

alter table public.banners
  drop constraint if exists banners_audience_check;

alter table public.banners
  add constraint banners_audience_check
  check (audience in ('all', 'general', 'ubm'));

create index if not exists site_images_audience_idx
  on public.site_images (placement, audience, is_active, sort_order);

create index if not exists banners_audience_idx
  on public.banners (placement, audience, is_active, sort_order);
