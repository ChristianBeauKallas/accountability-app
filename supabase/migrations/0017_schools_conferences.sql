-- 0017_schools_conferences.sql
-- Crowdsourced reference tables powering coach-onboarding autocomplete:
--   * schools       — institution typeahead + location prefill
--   * conferences   — conference suggestions filtered by level (division)
-- Any authenticated user can read all rows and add new ones (so a school or
-- conference a coach types that isn't in the system yet is saved — in proper
-- capitalization — for the next coach to pick). Nobody can update or delete,
-- so crowdsourced data can only grow, never be vandalized.

-- ---------------------------------------------------------------------------
-- schools
-- ---------------------------------------------------------------------------
create table if not exists public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  city       text,
  state      text,
  lat        double precision,
  lng        double precision,
  created_at timestamptz not null default now(),
  -- Dedup keys: case/whitespace-insensitive name, scoped by state so the same
  -- school name in two states stays distinct.
  name_key   text generated always as (lower(btrim(name))) stored,
  state_key  text generated always as (coalesce(upper(btrim(state)), '')) stored
);

create unique index if not exists schools_name_state_key
  on public.schools (name_key, state_key);

-- Prefix search support for the typeahead.
create index if not exists schools_name_key_idx on public.schools (name_key);

-- ---------------------------------------------------------------------------
-- conferences
-- ---------------------------------------------------------------------------
create table if not exists public.conferences (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  division   text not null,
  created_at timestamptz not null default now(),
  name_key   text generated always as (lower(btrim(name))) stored
);

create unique index if not exists conferences_name_division_key
  on public.conferences (name_key, division);

create index if not exists conferences_division_name_idx
  on public.conferences (division, name_key);

-- ---------------------------------------------------------------------------
-- RLS: read-all + insert for any signed-in user; no update/delete.
-- ---------------------------------------------------------------------------
alter table public.schools enable row level security;
alter table public.conferences enable row level security;

drop policy if exists "schools_select" on public.schools;
create policy "schools_select" on public.schools
  for select to authenticated using (true);

drop policy if exists "schools_insert" on public.schools;
create policy "schools_insert" on public.schools
  for insert to authenticated with check (true);

drop policy if exists "conferences_select" on public.conferences;
create policy "conferences_select" on public.conferences
  for select to authenticated using (true);

drop policy if exists "conferences_insert" on public.conferences;
create policy "conferences_insert" on public.conferences
  for insert to authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Seed schools from programs already in the system.
-- ---------------------------------------------------------------------------
insert into public.schools (name, city, state, lat, lng)
select distinct on (lower(btrim(p.name)), coalesce(upper(btrim(p.state)), ''))
  btrim(p.name), p.city, p.state, p.lat, p.lng
from public.programs p
where p.name is not null and btrim(p.name) <> ''
order by lower(btrim(p.name)), coalesce(upper(btrim(p.state)), ''), p.created_at
on conflict (name_key, state_key) do nothing;

-- ---------------------------------------------------------------------------
-- Seed conferences with a curated starter set per level. This is deliberately
-- not exhaustive — crowdsourcing fills the gaps — but covers the major
-- baseball conferences at each level so most coaches find theirs immediately.
-- ---------------------------------------------------------------------------
insert into public.conferences (name, division)
values
  -- NCAA Division II
  ('California Collegiate Athletic Association', 'D2'),
  ('Central Atlantic Collegiate Conference', 'D2'),
  ('Conference Carolinas', 'D2'),
  ('East Coast Conference', 'D2'),
  ('Great American Conference', 'D2'),
  ('Great Lakes Intercollegiate Athletic Conference', 'D2'),
  ('Great Lakes Valley Conference', 'D2'),
  ('Great Midwest Athletic Conference', 'D2'),
  ('Gulf South Conference', 'D2'),
  ('Lone Star Conference', 'D2'),
  ('Mid-America Intercollegiate Athletics Association', 'D2'),
  ('Mountain East Conference', 'D2'),
  ('Northeast-10 Conference', 'D2'),
  ('Northern Sun Intercollegiate Conference', 'D2'),
  ('Pacific West Conference', 'D2'),
  ('Peach Belt Conference', 'D2'),
  ('Pennsylvania State Athletic Conference', 'D2'),
  ('Rocky Mountain Athletic Conference', 'D2'),
  ('South Atlantic Conference', 'D2'),
  ('Sunshine State Conference', 'D2'),
  -- NCAA Division III
  ('American Rivers Conference', 'D3'),
  ('Centennial Conference', 'D3'),
  ('College Conference of Illinois and Wisconsin', 'D3'),
  ('Commonwealth Coast Conference', 'D3'),
  ('Empire 8', 'D3'),
  ('Heartland Collegiate Athletic Conference', 'D3'),
  ('Landmark Conference', 'D3'),
  ('Liberty League', 'D3'),
  ('Little East Conference', 'D3'),
  ('Massachusetts State Collegiate Athletic Conference', 'D3'),
  ('Michigan Intercollegiate Athletic Association', 'D3'),
  ('Middle Atlantic Conference', 'D3'),
  ('Midwest Conference', 'D3'),
  ('Minnesota Intercollegiate Athletic Conference', 'D3'),
  ('New England Small College Athletic Conference', 'D3'),
  ('New Jersey Athletic Conference', 'D3'),
  ('North Coast Athletic Conference', 'D3'),
  ('Northwest Conference', 'D3'),
  ('Ohio Athletic Conference', 'D3'),
  ('Old Dominion Athletic Conference', 'D3'),
  ('Southern Athletic Association', 'D3'),
  ('Southern California Intercollegiate Athletic Conference', 'D3'),
  ('State University of New York Athletic Conference', 'D3'),
  ('University Athletic Association', 'D3'),
  ('USA South Athletic Conference', 'D3'),
  ('Wisconsin Intercollegiate Athletic Conference', 'D3'),
  -- NAIA
  ('American Midwest Conference', 'NAIA'),
  ('Appalachian Athletic Conference', 'NAIA'),
  ('Cascade Collegiate Conference', 'NAIA'),
  ('Chicagoland Collegiate Athletic Conference', 'NAIA'),
  ('Continental Athletic Conference', 'NAIA'),
  ('Crossroads League', 'NAIA'),
  ('Frontier Conference', 'NAIA'),
  ('Golden State Athletic Conference', 'NAIA'),
  ('Great Plains Athletic Conference', 'NAIA'),
  ('Heart of America Athletic Conference', 'NAIA'),
  ('Kansas Collegiate Athletic Conference', 'NAIA'),
  ('Mid-South Conference', 'NAIA'),
  ('North Star Athletic Association', 'NAIA'),
  ('Red River Athletic Conference', 'NAIA'),
  ('Sooner Athletic Conference', 'NAIA'),
  ('Southern States Athletic Conference', 'NAIA'),
  ('The Sun Conference', 'NAIA'),
  ('Wolverine-Hoosier Athletic Conference', 'NAIA'),
  -- JUCO (NJCAA)
  ('Alabama Community College Conference', 'JUCO'),
  ('Arizona Community College Athletic Conference', 'JUCO'),
  ('Florida College System Activities Association', 'JUCO'),
  ('Kansas Jayhawk Community College Conference', 'JUCO'),
  ('Mid-West Athletic Conference', 'JUCO'),
  ('Minnesota College Athletic Conference', 'JUCO'),
  ('Mississippi Association of Community Colleges Conference', 'JUCO'),
  ('North Texas Junior College Athletic Conference', 'JUCO'),
  ('Scenic West Athletic Conference', 'JUCO'),
  ('Western Junior College Athletic Conference', 'JUCO')
on conflict (name_key, division) do nothing;
