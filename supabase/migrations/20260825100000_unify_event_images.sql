alter table public.site_images
  add column if not exists storage_path text;

insert into public.site_images (
  image_url,
  storage_path,
  alt_text,
  placement,
  event_id,
  sort_order,
  is_active
)
select
  e.image_url,
  case
    when e.image_url like '%/storage/v1/object/public/event-images/%'
      then split_part(e.image_url, '/storage/v1/object/public/event-images/', 2)
    else null
  end,
  e.title,
  'event',
  e.id,
  0,
  true
from public.events e
where e.image_url is not null
  and btrim(e.image_url) <> ''
  and not exists (
    select 1
    from public.site_images si
    where si.placement = 'event'
      and si.event_id = e.id
  );

update public.site_images
set storage_path = split_part(image_url, '/storage/v1/object/public/event-images/', 2)
where storage_path is null
  and image_url like '%/storage/v1/object/public/event-images/%';

alter table public.events
  drop column if exists image_url;

drop policy if exists "Event carousel editors can delete files" on storage.objects;
create policy "Event carousel editors can delete files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-images'
    and (
      public.is_global_admin()
      or exists (
        select 1
        from public.event_managers em
        where em.user_id = auth.uid()
          and em.role = 'editor'
          and (
            name like ('site-images/event/' || em.event_id::text || '/%')
            or name like (em.event_id::text || '/%')
          )
      )
    )
  );
