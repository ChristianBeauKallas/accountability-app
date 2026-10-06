-- Batting average for position players (e.g. 0.380).
alter table players
  add column if not exists batting_avg numeric(4,3);
