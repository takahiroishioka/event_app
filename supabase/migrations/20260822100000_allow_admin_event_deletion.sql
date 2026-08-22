grant delete on public.events to authenticated;

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events for delete to authenticated
  using (public.is_global_admin());
