-- 0020_facility_tags.sql
-- Replace the initial facility seed (0018) with a richer set of recruiting
-- value-adds, and fix "Outdoor housing" → "On-campus housing". Removes the
-- old starter rows that were renamed/replaced (keepers like Weight room and
-- Athletic training center stay). Safe to run more than once.

delete from public.facilities
where name_key in (
  'indoor training',
  'indoor batting cage',
  'training center',
  'outdoor housing',
  'academic facilities'
);

insert into public.facilities (name) values
  -- Facilities & tech
  ('On-campus stadium'),
  ('Indoor training facility'),
  ('Indoor batting cages'),
  ('Turf field'),
  ('Weight room'),
  ('Lights for night games'),
  ('TrackMan / Rapsodo'),
  ('Film & video room'),
  ('Athletic training center'),
  ('On-campus housing'),
  -- Development
  ('Player development focus'),
  ('Strength & conditioning'),
  ('Analytics-driven development'),
  ('Summer ball placement'),
  -- Academics
  ('Strong academics'),
  ('Academic support'),
  ('Scholarship opportunities'),
  ('Wide range of majors'),
  -- Results & culture
  ('Winning tradition'),
  ('Conference titles'),
  ('Sends players to 4-year programs'),
  ('Produces pro / draft players'),
  ('Tight-knit culture'),
  ('Playing-time opportunity'),
  ('Warm-weather location')
on conflict (name_key) do nothing;
