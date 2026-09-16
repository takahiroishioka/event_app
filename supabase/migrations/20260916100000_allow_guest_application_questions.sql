begin;
-- Guests need to read application questions, never other applicants' answers.
grant select on public.event_questions, public.event_question_options to anon, authenticated;

drop policy if exists "Anyone reads published event questions" on public.event_questions;
create policy "Anyone reads published event questions"
on public.event_questions for select to anon, authenticated
using (exists (
  select 1 from public.events e where e.id = event_questions.event_id and e.status = 'published'
));

drop policy if exists "Anyone reads published event question options" on public.event_question_options;
create policy "Anyone reads published event question options"
on public.event_question_options for select to anon, authenticated
using (exists (
  select 1 from public.event_questions q join public.events e on e.id = q.event_id
  where q.id = event_question_options.question_id and e.status = 'published'
));
commit;
