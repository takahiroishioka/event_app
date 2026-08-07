-- 既存のpaymentsテーブル・method列・CHECK制約をそのまま利用します。

create unique index if not exists payments_user_event_id_unique
  on public.payments(user_event_id);

alter table public.payments enable row level security;

drop policy if exists "Users can view own payments and admins can view all"
  on public.payments;
create policy "Users can view own payments and admins can view all"
  on public.payments for select to authenticated
  using (
    exists (
      select 1 from public.user_events ue
      where ue.id = payments.user_event_id
        and ue.user_id = auth.uid()
    )
    or exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'admin'
    )
  );

drop policy if exists "Users can create own pending payments"
  on public.payments;
create policy "Users can create own pending payments"
  on public.payments for insert to authenticated
  with check (
    status = 'pending'
    and method in ('bank', 'cash')
    and exists (
      select 1
      from public.user_events ue
      join public.events e on e.id = ue.event_id
      where ue.id = payments.user_event_id
        and ue.user_id = auth.uid()
        and ue.status in ('reserved', 'joined')
        and e.fee = payments.amount
        and e.fee > 0
    )
  );

drop policy if exists "Users can update own pending payment method"
  on public.payments;
create policy "Users can update own pending payment method"
  on public.payments for update to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.user_events ue
      where ue.id = payments.user_event_id
        and ue.user_id = auth.uid()
    )
  )
  with check (
    status = 'pending'
    and method in ('bank', 'cash')
    and exists (
      select 1 from public.user_events ue
      where ue.id = payments.user_event_id
        and ue.user_id = auth.uid()
    )
  );

revoke insert, update on public.payments from authenticated;
grant select on public.payments to authenticated;
grant insert (user_event_id, amount, method)
  on public.payments to authenticated;
grant update (method, updated_at)
  on public.payments to authenticated;
