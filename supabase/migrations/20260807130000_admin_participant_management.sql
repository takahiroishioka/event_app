-- 管理者だけが参加者・参加状態・支払い状態を変更できます。
alter table public.users enable row level security;
alter table public.user_events enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Admins can update participant profiles" on public.users;
create policy "Admins can update participant profiles"
  on public.users for update to authenticated
  using (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ))
  with check (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ));

drop policy if exists "Admins can update registrations" on public.user_events;
create policy "Admins can update registrations"
  on public.user_events for update to authenticated
  using (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ))
  with check (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ));

drop policy if exists "Admins can update payments" on public.payments;
create policy "Admins can update payments"
  on public.payments for update to authenticated
  using (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ))
  with check (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ));

grant update (name, email, updated_at) on public.users to authenticated;
grant update (status, updated_at, cancellation_requested_at, cancellation_reason, checked_in_at) on public.user_events to authenticated;
grant update (status, method, paid_at, transaction_id, updated_at) on public.payments to authenticated;
