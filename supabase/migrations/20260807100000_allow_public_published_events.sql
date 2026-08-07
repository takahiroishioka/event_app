do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'Anyone can view published events'
  ) then
    create policy "Anyone can view published events"
      on public.events
      for select
      to anon, authenticated
      using (status = 'published');
  end if;
end
$$;
