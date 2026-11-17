-- Multiple photos per check-in.
-- Keep the existing single photo_url (always the first image, for backward
-- compatibility) and add an array that holds all of them.

alter table public.wl_checkins
  add column if not exists photo_urls text[];

-- Backfill existing rows so they render through the same array path.
update public.wl_checkins
  set photo_urls = array[photo_url]
  where photo_urls is null
    and photo_url is not null;
