-- Columns the onboarding flow depends on. Both use "if not exists", so this is
-- safe to run even if one already exists.
--
-- Run once against your Supabase database (SQL editor or psql).

-- Short bio shown on the profile ("What are you working on?"), set during the
-- Welcome tour.
alter table public.profiles add column if not exists bio text;

-- When the member finished the first-run Welcome tour. Null = never finished,
-- so the tour keeps auto-opening (on any device) until it's done. This flag is
-- also what triggers the read-the-board + posting walkthrough on the next open,
-- including from the installed home-screen app.
alter table public.profiles add column if not exists onboarded_at timestamptz;
