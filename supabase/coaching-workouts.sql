-- =============================================================================
-- My Plan (Wave 2): the workout logger — actual weight/reps per set + effort,
-- with per-exercise history (feeds Wave 3 auto-progression). Depends on
-- coaching.sql + coaching-plans.sql. Safe to re-run.
-- =============================================================================

-- One logged workout session per day.
create table if not exists public.coaching_workout_logs (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  client_id       uuid not null references public.profiles (id) on delete cascade,
  plan_workout_id uuid references public.coaching_plan_workouts (id) on delete set null,
  title           text,
  day             date not null,
  effort          text,   -- 'easy' | 'right' | 'hard'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (relationship_id, day)
);

-- The actual sets performed.
create table if not exists public.coaching_exercise_sets (
  id             uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.coaching_workout_logs (id) on delete cascade,
  exercise_name  text not null,
  set_index      int not null,
  weight         numeric,
  reps           int,
  created_at     timestamptz not null default now()
);

create index if not exists idx_wlogs_rel on public.coaching_workout_logs (relationship_id, day desc);
create index if not exists idx_sets_log on public.coaching_exercise_sets (workout_log_id);
create index if not exists idx_sets_ex on public.coaching_exercise_sets (exercise_name, created_at desc);

alter table public.coaching_workout_logs  enable row level security;
alter table public.coaching_exercise_sets enable row level security;

drop policy if exists wlogs_select on public.coaching_workout_logs;
create policy wlogs_select on public.coaching_workout_logs
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists wlogs_write on public.coaching_workout_logs;
create policy wlogs_write on public.coaching_workout_logs
  for all to authenticated
  using (client_id = auth.uid() and public.is_client_of_rel(relationship_id))
  with check (client_id = auth.uid() and public.is_client_of_rel(relationship_id));

drop policy if exists sets_select on public.coaching_exercise_sets;
create policy sets_select on public.coaching_exercise_sets
  for select to authenticated using (
    exists (
      select 1 from public.coaching_workout_logs w
      where w.id = workout_log_id and public.in_relationship(w.relationship_id)
    )
  );
drop policy if exists sets_write on public.coaching_exercise_sets;
create policy sets_write on public.coaching_exercise_sets
  for all to authenticated using (
    exists (
      select 1 from public.coaching_workout_logs w
      where w.id = workout_log_id and w.client_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.coaching_workout_logs w
      where w.id = workout_log_id and w.client_id = auth.uid()
    )
  );
