-- Pitch arsenal for pitchers (RHP/LHP). Non-null array, defaults to empty.
alter table players
  add column if not exists pitches text[] not null default '{}';
