begin;

update public.event_questions
set question_text = 'メールアドレス/連絡の取れるSNSアカウントリンク'
where application_field = 'sns';

create or replace function public.add_required_application_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_questions(event_id, question_text, question_type, is_required, sort_order, application_field)
  values (new.id, '名前', 'text', true, 0, 'name'),
         (new.id, 'メールアドレス/連絡の取れるSNSアカウントリンク', 'text', true, 1, 'sns');
  return new;
end;
$$;

commit;
