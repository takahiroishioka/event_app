-- 既存イベントアプリと同じSupabaseプロジェクトのSQL Editorで実行してください。
-- ログイン不要：anonロールに一覧取得・登録・編集・PDFアップロードを許可します。
-- 公開データです。機密情報・非公開書類には使用しないでください。
begin;

create or replace function public.tibasibu_document_is_valid(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    jsonb_typeof(value) = 'object'
    and jsonb_typeof(value -> 'name') = 'string'
    and length(btrim(value ->> 'name')) between 1 and 255
    and (value ->> 'name') ~* '\.pdf$'
    and jsonb_typeof(value -> 'path') = 'string'
    and (value ->> 'path') ~ '^[0-9a-f-]{36}/(application|report)/[0-9a-f-]{36}\.pdf$'
    and case when jsonb_typeof(value -> 'size') = 'number'
      then (value ->> 'size')::numeric between 5 and 10485760 else false end,
    false
  );
$$;

create table if not exists public.tibasibu_meetings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  starts_at timestamptz not null check (starts_at >= '1999-12-31 15:00:00+00' and starts_at < '2100-12-31 15:00:00+00'),
  status text not null default 'pending' check (status in ('pending', 'settled')),
  payee text not null default '' check (length(payee) <= 300),
  application jsonb check (application is null or (public.tibasibu_document_is_valid(application) and application ->> 'path' like id::text || '/application/%')),
  report jsonb check (report is null or (public.tibasibu_document_is_valid(report) and report ->> 'path' like id::text || '/report/%')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists tibasibu_meetings_starts_at_idx on public.tibasibu_meetings(starts_at desc, id);

create or replace function public.set_tibasibu_meeting_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  new.created_at = old.created_at;
  return new;
end;
$$;
drop trigger if exists tibasibu_meeting_updated_at on public.tibasibu_meetings;
create trigger tibasibu_meeting_updated_at before update on public.tibasibu_meetings
  for each row execute function public.set_tibasibu_meeting_updated_at();

alter table public.tibasibu_meetings enable row level security;
revoke all on public.tibasibu_meetings from anon, authenticated;
grant usage on schema public to anon;
grant select on public.tibasibu_meetings to anon;
grant insert (id, name, starts_at, status, payee, application, report) on public.tibasibu_meetings to anon;
grant update (name, starts_at, status, payee, application, report) on public.tibasibu_meetings to anon;
revoke all on function public.tibasibu_document_is_valid(jsonb) from public;
grant execute on function public.tibasibu_document_is_valid(jsonb) to anon;
revoke all on function public.set_tibasibu_meeting_updated_at() from public;

drop policy if exists "tibasibu_meetings_read" on public.tibasibu_meetings;
create policy "tibasibu_meetings_read" on public.tibasibu_meetings for select to anon using (true);
drop policy if exists "tibasibu_meetings_insert" on public.tibasibu_meetings;
create policy "tibasibu_meetings_insert" on public.tibasibu_meetings for insert to anon with check (true);
drop policy if exists "tibasibu_meetings_update" on public.tibasibu_meetings;
create policy "tibasibu_meetings_update" on public.tibasibu_meetings for update to anon using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tibasibu-documents', 'tibasibu-documents', true, 10485760, array['application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

drop policy if exists "tibasibu_documents_upload" on storage.objects;
create policy "tibasibu_documents_upload" on storage.objects for insert to anon
with check (
  bucket_id = 'tibasibu-documents'
  and name ~ '^[0-9a-f-]{36}/(application|report)/[0-9a-f-]{36}\.pdf$'
);
-- public bucketなのでダウンロードにログインは不要です。
-- 利用者によるファイル一覧取得・上書き・削除の権限は追加しません。
commit;
