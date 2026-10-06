-- Extra pitching metrics: spin rate (rpm) and ERA.
alter table players
  add column if not exists spin_rate int,
  add column if not exists era numeric(4,2);
