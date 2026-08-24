drop policy if exists "Event editors can upload assigned event files" on storage.objects;

create policy "Event managers can upload carousel files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-images'
    and (
      public.is_global_admin()
      or exists (
        select 1
        from public.event_managers em
        where em.user_id = auth.uid()
          and em.role = 'editor'
          and name like ('site-images/event/' || em.event_id::text || '/%')
      )
    )
  );
