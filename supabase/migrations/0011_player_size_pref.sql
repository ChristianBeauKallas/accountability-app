-- Athletx — Phase 7: player school-size preference
-- Soft ranking signal: 'small' | 'medium' | 'large' (null = no preference).
alter table public.players
  add column if not exists pref_size text;
