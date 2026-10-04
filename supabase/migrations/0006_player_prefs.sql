-- Athletx — Phase 4.6: player recruiting preferences (feed filters)
alter table public.players
  add column if not exists pref_divisions text[] not null default '{}',
  add column if not exists pref_states text[] not null default '{}',
  add column if not exists pref_climate text;  -- null/'any' | 'warm' | 'mild' | 'cold'
