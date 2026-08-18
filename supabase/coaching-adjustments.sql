-- =============================================================================
-- My Plan: per-day workout adjustments. The client can talk through how they're
-- feeling ("knee's sore, only 40 min today") and the AI reworks TODAY'S session
-- only — the coach's recurring weekly plan is untouched. Depends on
-- coaching.sql + coaching-plans.sql. Safe to re-run.
-- =============================================================================

create table if not exists public.coaching_workout_adjustments (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  client_id       uuid not null references public.profiles (id) on delete cascade,
  plan_workout_id uuid references public.coaching_plan_workouts (id) on delete set null,
  day             date not null,
  title           text,
  detail          text,
  exercises       jsonb,   -- same shape as coaching_plan_workouts.exercises
  note            text,    -- the client's (cleaned) request
  reason          text,    -- the AI's short explanation of what changed
  created_at      timestamptz not null default now(),
  unique (relationship_id, day)
);

create index if not exists idx_wadj_rel_day
  on public.coaching_workout_adjustments (relationship_id, day desc);

alter table public.coaching_workout_adjustments enable row level security;

-- Both sides of the relationship can read the adjustment (coach sees it too).
drop policy if exists wadj_select on public.coaching_workout_adjustments;
create policy wadj_select on public.coaching_workout_adjustments
  for select to authenticated using (public.in_relationship(relationship_id));

-- Only the client creates/updates their own adjustment.
drop policy if exists wadj_write on public.coaching_workout_adjustments;
create policy wadj_write on public.coaching_workout_adjustments
  for all to authenticated
  using (client_id = auth.uid() and public.is_client_of_rel(relationship_id))
  with check (client_id = auth.uid() and public.is_client_of_rel(relationship_id));
