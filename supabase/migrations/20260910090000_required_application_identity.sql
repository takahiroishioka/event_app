-- Safe to rerun after a failed or partial application.
begin;

alter table public.event_questions
  add column if not exists application_field text check (application_field in ('name', 'sns'));

create unique index if not exists event_questions_application_field_idx
  on public.event_questions(event_id, application_field)
  where application_field is not null;

alter table public.event_questions drop constraint if exists application_identity_required;
alter table public.event_questions add constraint application_identity_required
  check (application_field is null or (is_required and question_type = 'text'));

-- Reserve positions 0 and 1 only for events that have not been migrated yet.
update public.event_questions q set sort_order = q.sort_order + 2
where q.application_field is null and not exists (
  select 1 from public.event_questions identity_question
  where identity_question.event_id = q.event_id
    and identity_question.application_field is not null
);

insert into public.event_questions(event_id, question_text, question_type, is_required, sort_order, application_field)
select e.id, f.label, 'text', true, f.position, f.kind
from public.events e cross join (values
  ('name', '名前', 0),
  ('sns', '連絡の取れるSNSアドレス', 1)
) as f(kind, label, position)
on conflict (event_id, application_field) where application_field is not null do nothing;

create or replace function public.add_required_application_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_questions(event_id, question_text, question_type, is_required, sort_order, application_field)
  values (new.id, '名前', 'text', true, 0, 'name'),
         (new.id, '連絡の取れるSNSアドレス', 'text', true, 1, 'sns');
  return new;
end;
$$;

drop trigger if exists add_required_application_identity on public.events;
create trigger add_required_application_identity
after insert on public.events for each row
execute function public.add_required_application_identity();

commit;
