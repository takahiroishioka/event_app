begin;

create table if not exists public.study_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  description text check (description is null or char_length(description) <= 3000),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_holding_requests (
  id uuid primary key,
  topic_id uuid not null references public.study_topics(id) on delete restrict,
  topic_title text not null,
  line_name text not null check (char_length(btrim(line_name)) between 1 and 100),
  preferred_schedule text check (preferred_schedule is null or char_length(preferred_schedule) <= 1000),
  message text check (message is null or char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists study_holding_requests_created_idx on public.study_holding_requests(created_at desc);
create index if not exists study_holding_requests_topic_idx on public.study_holding_requests(topic_id);
alter table public.study_topics enable row level security;
alter table public.study_holding_requests enable row level security;

revoke all on public.study_topics, public.study_holding_requests from public, anon, authenticated;
grant select on public.study_topics to anon, authenticated;
grant insert, update on public.study_topics to authenticated;
grant select on public.study_holding_requests to authenticated;
grant update (status, updated_at) on public.study_holding_requests to authenticated;

drop policy if exists "Public reads active study topics" on public.study_topics;
create policy "Public reads active study topics" on public.study_topics
for select to anon, authenticated using (is_active);
drop policy if exists "Admins manage study topics" on public.study_topics;
create policy "Admins manage study topics" on public.study_topics
for all to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
drop policy if exists "Admins read study requests" on public.study_holding_requests;
create policy "Admins read study requests" on public.study_holding_requests
for select to authenticated using (public.is_global_admin());
drop policy if exists "Admins update study requests" on public.study_holding_requests;
create policy "Admins update study requests" on public.study_holding_requests
for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());

create or replace function public.submit_study_holding_request(
  p_request_id uuid, p_topic_id uuid, p_line_name text,
  p_schedule text default null, p_message text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_existing public.study_holding_requests%rowtype;
begin
  if p_request_id is null or p_topic_id is null then raise exception '勉強会を選び直してください。'; end if;
  if char_length(btrim(coalesce(p_line_name, ''))) not between 1 and 100 then raise exception 'LINE登録名を入力してください。'; end if;
  if char_length(coalesce(p_schedule, '')) > 1000 or char_length(coalesce(p_message, '')) > 2000 then raise exception '入力内容が長すぎます。'; end if;
  -- Serialize retries of the same submission without revealing requests to the public.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_existing from public.study_holding_requests where id = p_request_id;
  if found then
    if v_existing.topic_id = p_topic_id and v_existing.line_name = btrim(p_line_name)
      and coalesce(v_existing.preferred_schedule, '') = btrim(coalesce(p_schedule, ''))
      and coalesce(v_existing.message, '') = btrim(coalesce(p_message, '')) then
      return p_request_id;
    end if;
    raise exception '内容が変更されたため、ページを再読み込みして送信してください。';
  end if;
  select title into v_title from public.study_topics where id = p_topic_id and is_active for share;
  if not found then raise exception 'この勉強会は現在、開催希望を受け付けていません。'; end if;
  insert into public.study_holding_requests(id, topic_id, topic_title, line_name, preferred_schedule, message)
  values (p_request_id, p_topic_id, v_title, btrim(p_line_name), nullif(btrim(p_schedule), ''), nullif(btrim(p_message), ''));
  return p_request_id;
end;
$$;
revoke all on function public.submit_study_holding_request(uuid, uuid, text, text, text) from public;
grant execute on function public.submit_study_holding_request(uuid, uuid, text, text, text) to anon, authenticated;

commit;
