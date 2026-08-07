create table if not exists public.top_page_settings (
  id boolean primary key default true check (id = true),
  site_name text not null default 'TYPESTYLE EVENT',
  hero_title text not null default 'イベントを見つけよう',
  hero_description text not null default '開催予定のイベントをチェックして、気になるイベントに参加できます。',
  updated_at timestamptz not null default now()
);

insert into public.top_page_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.top_page_settings enable row level security;

create policy "Anyone can view top page settings"
  on public.top_page_settings for select
  to anon, authenticated
  using (true);

create policy "Admins can update top page settings"
  on public.top_page_settings for update
  to authenticated
  using (exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ))
  with check (exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ));
