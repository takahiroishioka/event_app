begin;

-- Posting voices is available to signed-in users, independently of admin roles.
grant select on public.voice_lines, public.voice_posts to authenticated;
grant insert on public.voice_posts to authenticated;

drop policy if exists "Users create own voice posts" on public.voice_posts;
create policy "Users create own voice posts"
on public.voice_posts for insert to authenticated
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.voice_lines line
    where line.id = voice_posts.line_id and line.status = 'published'
  )
);

drop policy if exists "Users upload own voice recordings" on storage.objects;
create policy "Users upload own voice recordings"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'voice-recordings'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
