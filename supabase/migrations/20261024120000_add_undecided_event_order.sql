alter table public.events
  add column if not exists undecided_sort_order integer not null default 0
  check (undecided_sort_order >= 0);
