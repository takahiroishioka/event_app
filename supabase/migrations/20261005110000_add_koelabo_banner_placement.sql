begin;
alter table public.banners drop constraint if exists banners_placement_check;
alter table public.banners add constraint banners_placement_check
  check (placement in ('top', 'mypage', 'koelabo'));
commit;
