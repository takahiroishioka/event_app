create table if not exists public.site_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text,
  placement text not null check (placement in ('top', 'event')),
  event_id uuid references public.events(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_images_placement_event_check check (
    (placement = 'top' and event_id is null)
    or (placement = 'event' and event_id is not null)
  )
);

create index if not exists site_images_display_idx
  on public.site_images (placement, event_id, is_active, sort_order);

alter table public.site_images enable row level security;

create policy "Anyone can view active site images"
  on public.site_images for select
  using (is_active = true or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ));

create policy "Admins can insert site images"
  on public.site_images for insert
  with check (exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ));

create policy "Admins can update site images"
  on public.site_images for update
  using (exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ))
  with check (exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ));

create policy "Admins can delete site images"
  on public.site_images for delete
  using (exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ));
