alter table public.study_topics add column if not exists image_url text;

-- Existing table grants and admin-only write policies also cover this column.
