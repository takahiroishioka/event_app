alter table public.payments
  add column if not exists note text;

alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (status = any (array[
    'pending'::text,
    'confirmation_requested'::text,
    'paid'::text,
    'failed'::text,
    'refunded'::text,
    'cancelled'::text
  ]));

drop policy if exists "Users can insert own payments" on public.payments;
drop policy if exists "Users can update own payment method" on public.payments;

create policy "Users can insert own payments"
on public.payments for insert
to authenticated
with check (
  status = 'pending'
  and exists (
    select 1
    from public.user_events ue
    join public.events e on e.id = ue.event_id
    where ue.id = payments.user_event_id
      and ue.user_id = auth.uid()
      and ue.status in ('reserved', 'joined')
      and payments.amount = e.fee
      and (
        (e.fee = 0 and payments.method = 'free')
        or
        (e.fee > 0 and payments.method in ('cash', 'bank')
          and (e.fee >= 1000 or payments.method = 'cash'))
      )
  )
);

create policy "Users can update own pending payments"
on public.payments for update
to authenticated
using (
  status = 'pending'
  and exists (
    select 1 from public.user_events ue
    where ue.id = payments.user_event_id
      and ue.user_id = auth.uid()
  )
)
with check (
  status in ('pending', 'confirmation_requested')
  and exists (
    select 1
    from public.user_events ue
    join public.events e on e.id = ue.event_id
    where ue.id = payments.user_event_id
      and ue.user_id = auth.uid()
      and ue.status in ('reserved', 'joined')
      and payments.amount = e.fee
      and (
        (e.fee = 0 and payments.status = 'pending' and payments.method = 'free')
        or
        (e.fee > 0 and payments.method in ('cash', 'bank')
          and (e.fee >= 1000 or payments.method = 'cash'))
      )
  )
);

revoke insert, update on public.payments from authenticated;
grant insert (user_event_id, amount, method, note) on public.payments to authenticated;
grant update (method, note, status, updated_at) on public.payments to authenticated;
