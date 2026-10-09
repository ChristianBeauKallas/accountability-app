-- 0024_player_levels.sql
-- Adds a player "level" (high school / JUCO / four-year) and lets a need
-- target one or more of those player types, so coaches can recruit by where
-- a player is coming from — not just by grad year / transfer flag.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- players.level — where the player currently is.
--   'high_school' | 'juco' | 'four_year'
-- ---------------------------------------------------------------------------
alter table public.players
  add column if not exists level text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'players_level_check'
  ) then
    alter table public.players
      add constraint players_level_check
      check (level is null or level in ('high_school', 'juco', 'four_year'));
  end if;
end$$;

-- Backfill existing players from the transfer flag. Plain transfers (origin
-- school unknown) default to four-year; everyone else is treated as HS.
update public.players
  set level = case when is_transfer then 'four_year' else 'high_school' end
  where level is null;

-- ---------------------------------------------------------------------------
-- needs.player_types — which player levels this need targets.
-- Empty array = no restriction (legacy behavior: grad year + transfer flag).
-- ---------------------------------------------------------------------------
alter table public.needs
  add column if not exists player_types text[] not null default '{}';
