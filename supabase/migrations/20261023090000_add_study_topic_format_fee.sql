alter table public.study_topics
  add column if not exists meeting_format text check (meeting_format in ('zoom', 'in_person')),
  add column if not exists fee integer check (fee >= 0);

-- Existing topics remain unspecified until an admin sets their format and fee.
-- Existing admin-only write policies and table grants cover these columns.
