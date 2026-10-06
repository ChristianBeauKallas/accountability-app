-- Athletx — Phase 7.1: multi-select climate + size preferences
-- Weather and size become lists (pick several). States are additive to
-- climate, not an override — handled in lib/fit.ts.

alter table public.players
  add column if not exists pref_climates text[] not null default '{}',
  add column if not exists pref_sizes text[] not null default '{}';

-- Backfill the new array columns from the old single-value columns.
update public.players
  set pref_climates = array[pref_climate]
  where pref_climate is not null
    and pref_climate <> 'any'
    and coalesce(array_length(pref_climates, 1), 0) = 0;

update public.players
  set pref_sizes = array[pref_size]
  where pref_size is not null
    and pref_size <> 'any'
    and coalesce(array_length(pref_sizes, 1), 0) = 0;
