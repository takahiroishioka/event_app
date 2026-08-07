alter table public.events
  add column if not exists payment_management_required boolean not null default false,
  add column if not exists payment_note text;

update public.events
set payment_management_required = true
where fee > 0;
