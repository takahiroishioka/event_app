begin;
alter table public.site_images drop constraint if exists site_images_placement_check;
alter table public.site_images add constraint site_images_placement_check check (placement in ('top', 'top_intro', 'service_work', 'service_sns', 'event', 'banner'));
alter table public.site_images drop constraint if exists site_images_placement_owner_check;
alter table public.site_images add constraint site_images_placement_owner_check check (
  (placement in ('top', 'top_intro', 'service_work', 'service_sns') and event_id is null and banner_id is null)
  or (placement = 'event' and event_id is not null and banner_id is null)
  or (placement = 'banner' and event_id is null and banner_id is not null)
);
commit;
