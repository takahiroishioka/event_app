create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  link_url text not null,
  placement text not null check (placement in ('top', 'mypage')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.banners enable row level security;

grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;

create policy "Anyone can view active banners" on public.banners for select
using (is_active = true or exists (
  select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid() and r.name = 'admin'
));

create policy "Admins can insert banners" on public.banners for insert
with check (exists (
  select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid() and r.name = 'admin'
));

create policy "Admins can update banners" on public.banners for update
using (exists (
  select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid() and r.name = 'admin'
)) with check (exists (
  select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid() and r.name = 'admin'
));

create policy "Admins can delete banners" on public.banners for delete
using (exists (
  select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid() and r.name = 'admin'
));

alter table public.site_images add column if not exists banner_id uuid references public.banners(id) on delete cascade;
alter table public.site_images drop constraint if exists site_images_placement_check;
alter table public.site_images drop constraint if exists site_images_placement_event_check;
alter table public.site_images add constraint site_images_placement_check
  check (placement in ('top', 'event', 'banner'));
alter table public.site_images add constraint site_images_placement_owner_check check (
  (placement = 'top' and event_id is null and banner_id is null)
  or (placement = 'event' and event_id is not null and banner_id is null)
  or (placement = 'banner' and event_id is null and banner_id is not null)
);

create index if not exists site_images_banner_idx
  on public.site_images (banner_id, is_active, sort_order);
