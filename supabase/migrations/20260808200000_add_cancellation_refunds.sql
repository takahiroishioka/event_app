alter table public.user_events
  add column if not exists refund_method text
  check (refund_method is null or refund_method in ('bank', 'hand'));

grant update (refund_method) on public.user_events to authenticated;

create or replace function public.approve_event_cancellation(p_user_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_payment public.payments%rowtype;
  v_refund_method text;
begin
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception '管理者権限が必要です';
  end if;

  select refund_method into v_refund_method
  from public.user_events
  where id = p_user_event_id and status = 'cancel_requested'
  for update;

  if not found then
    raise exception '対象のキャンセル申請が見つかりません';
  end if;

  select * into v_payment
  from public.payments
  where user_event_id = p_user_event_id
  for update;

  if found and v_payment.status = 'paid' then
    if v_refund_method is null then
      raise exception '返金方法が選択されていません';
    end if;
    update public.payments
    set status = 'refunded', updated_at = now()
    where id = v_payment.id;
  elsif found and v_payment.status <> 'refunded' then
    update public.payments
    set status = 'cancelled', updated_at = now()
    where id = v_payment.id;
  end if;

  update public.user_events
  set status = 'cancelled', updated_at = now()
  where id = p_user_event_id;
end;
$$;

revoke all on function public.approve_event_cancellation(uuid) from public;
grant execute on function public.approve_event_cancellation(uuid) to authenticated;
