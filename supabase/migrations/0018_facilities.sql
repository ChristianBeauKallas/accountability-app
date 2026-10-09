-- 0018_facilities.sql
-- Crowdsourced list of program facility/amenity tags a coach can click to
-- describe their program (and feed the AI "About" generator). Mirrors the
-- schools/conferences pattern: any authenticated user reads all and can add
-- new ones (so a facility a coach types is saved for the next coach), nobody
-- updates or deletes.

create table if not exists public.facilities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now(),
  name_key   text generated always as (lower(btrim(name))) stored
);

create unique index if not exists facilities_name_key on public.facilities (name_key);

alter table public.facilities enable row level security;

drop policy if exists "facilities_select" on public.facilities;
create policy "facilities_select" on public.facilities
  for select to authenticated using (true);

drop policy if exists "facilities_insert" on public.facilities;
create policy "facilities_insert" on public.facilities
  for insert to authenticated with check (true);

-- Seed the starter set.
insert into public.facilities (name)
values
  ('Indoor training'),
  ('Indoor batting cage'),
  ('Weight room'),
  ('Training center'),
  ('Outdoor housing'),
  ('Athletic training center'),
  ('Academic facilities')
on conflict (name_key) do nothing;
