create table if not exists public.footer_settings (
  id boolean primary key default true check (id = true),
  brand_name text not null default 'shiokan',
  instagram_url text,
  x_url text,
  youtube_url text,
  updated_at timestamptz not null default now()
);

insert into public.footer_settings (id, brand_name)
values (true, 'shiokan')
on conflict (id) do nothing;

alter table public.footer_settings enable row level security;
grant select on public.footer_settings to anon, authenticated;
grant update (brand_name, instagram_url, x_url, youtube_url, updated_at) on public.footer_settings to authenticated;

create policy "Anyone can view footer settings" on public.footer_settings for select using (true);
create policy "Admins can update footer settings" on public.footer_settings for update
using (exists (
  select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid() and r.name = 'admin'
))
with check (exists (
  select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid() and r.name = 'admin'
));
