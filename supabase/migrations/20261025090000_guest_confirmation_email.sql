-- Atomically create a guest reservation and its confirmation mail record.
create table public.guest_confirmation_emails (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  registration_id uuid not null unique references public.guest_event_registrations(id) on delete cascade,
  email text not null,
  request_hash text not null,
  payload jsonb not null,
  status text not null default 'pending' check(status in ('pending','sent','failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.guest_confirmation_emails enable row level security;
revoke all on public.guest_confirmation_emails from anon, authenticated;
grant all on public.guest_confirmation_emails to service_role;
create index guest_confirmation_email_rate_idx on public.guest_confirmation_emails(email, created_at);
create index guest_confirmation_request_rate_idx on public.guest_confirmation_emails(request_hash, created_at);

create or replace function public.reserve_guest_with_email(
  p_event_id uuid, p_guest_name text, p_email text, p_answers jsonb,
  p_plan_id uuid, p_request_id uuid, p_request_hash text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_existing public.guest_confirmation_emails; v_registration uuid;
  v_event public.events; v_plan public.event_plans; v_status text; v_payload jsonb; v_mail_id uuid;
begin
  if p_request_id is null or p_request_hash is null or length(p_request_hash)<>64 then raise exception '受付情報が正しくありません。'; end if;
  if length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'メールアドレスを確認してください。'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_existing from public.guest_confirmation_emails where request_id=p_request_id;
  if found then
    if v_existing.email<>p_email or v_existing.payload->>'eventId'<>p_event_id::text then raise exception '受付情報が一致しません。'; end if;
    return jsonb_build_object('mailId',v_existing.id,'status',v_existing.status,'payload',v_existing.payload,'createdAt',v_existing.created_at);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('guest-email-rate', 0));
  if (select count(*) from public.guest_confirmation_emails where email=p_email and created_at>now()-interval '1 hour')>=5
    or (select count(*) from public.guest_confirmation_emails where request_hash=p_request_hash and created_at>now()-interval '1 hour')>=10 then
    raise exception '短時間の申し込みが多いため、時間をおいてお試しください。';
  end if;
  select * into v_event from public.events where id=p_event_id and status='published' for update;
  if not found or v_event.start_at is null or v_event.start_at<=now() then raise exception '現在、このイベントには申し込めません。'; end if;
  v_registration:=public.submit_guest_event_application(p_event_id,p_guest_name,p_answers,p_plan_id);
  select status into v_status from public.guest_event_registrations where id=v_registration;
  if p_plan_id is not null then select * into v_plan from public.event_plans where id=p_plan_id; end if;
  v_payload:=jsonb_build_object('registrationId',v_registration,'eventId',p_event_id,'name',btrim(p_guest_name),'email',p_email,
    'title',v_event.title,'startAt',v_event.start_at,'location',v_event.location,'fee',coalesce(v_plan.fee,v_event.fee),
    'planName',v_plan.name,'reservationStatus',v_status);
  insert into public.guest_confirmation_emails(request_id,registration_id,email,request_hash,payload)
    values(p_request_id,v_registration,p_email,p_request_hash,v_payload) returning id into v_mail_id;
  return jsonb_build_object('mailId',v_mail_id,'status','pending','payload',v_payload,'createdAt',now());
end $$;
revoke all on function public.reserve_guest_with_email(uuid,text,text,jsonb,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_guest_with_email(uuid,text,text,jsonb,uuid,uuid,text) to service_role;
