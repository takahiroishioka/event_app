-- 支払確認時に管理者が支払日時とステータスを更新できるようにします。
grant update (status, method, paid_at, transaction_id, updated_at)
on public.payments
to authenticated;
