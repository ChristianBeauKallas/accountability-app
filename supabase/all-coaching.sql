-- =============================================================================
-- COMBINED coaching migration — run once. Idempotent (safe to re-run).
-- Order: coaching → macros → plans → workouts → adjustments → plan-feed.
-- Requires schema.sql to have been run first.
-- =============================================================================


-- ############################################################################
-- ## coaching.sql
-- ############################################################################

-- =============================================================================
-- 1:1 Coaching — coach-defined trackers + the client's editable, timestamped
-- daily log. Private to the coach and client. Run once against your database.
--
-- Model: the coach defines TRACKERS (what to log). The client logs ENTRIES
-- against them throughout the day. Every entry stores BOTH happened_at (the
-- time of the event, editable/backdatable) and logged_at (when it was actually
-- entered) so the coach can tell real-time logging from end-of-day batching.
-- coaching_relationships + checkins already exist from the base schema; the
-- entry log below supersedes the single-row checkin for day-to-day tracking.
-- =============================================================================

-- ---- trackers: the coach defines what to track ------------------------------
create table if not exists public.coaching_trackers (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  label           text not null,
  emoji           text,
  prompt          text,   -- context question for the note field ("What did you eat?")
  sort_order      int not null default 0,
  repeatable      boolean not null default false, -- many/day (meal, water) vs once/day (wake, sleep)
  wants_photo     boolean not null default false,
  wants_note      boolean not null default true,
  wants_amount    boolean not null default false,
  unit            text,                            -- e.g. 'oz', 'lb', 'min'
  target          numeric,                         -- optional daily goal
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---- entries: the client logs against a tracker -----------------------------
create table if not exists public.coaching_entries (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  client_id       uuid not null references public.profiles (id) on delete cascade,
  tracker_id      uuid not null references public.coaching_trackers (id) on delete cascade,
  happened_at     timestamptz not null default now(), -- editable / backdatable
  detail          text,
  amount          numeric,
  logged_at       timestamptz not null default now(), -- when it was actually entered
  created_at      timestamptz not null default now()
);

-- ---- coach feedback, one note per day ---------------------------------------
create table if not exists public.coaching_feedback (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  coach_id        uuid not null references public.profiles (id) on delete cascade,
  day             date not null,
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (relationship_id, day)
);

-- ---- coach-scheduled reminders (nudges) -------------------------------------
create table if not exists public.coaching_reminders (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  tracker_id      uuid references public.coaching_trackers (id) on delete cascade,
  label           text not null,
  at_minute       int not null,  -- minutes since local midnight (6:30am = 390)
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---- context prompts on trackers (safe to re-run) ---------------------------
alter table public.coaching_trackers add column if not exists prompt text;
update public.coaching_trackers set prompt = case label
    when 'Meal'     then 'What did you eat?'
    when 'Water'    then 'What did you drink?'
    when 'Exercise' then 'What did you do?'
    when 'Read'     then 'What did you read?'
    when 'Podcast'  then 'What did you listen to?'
    else prompt
  end
  where prompt is null;

-- ---- media can attach to an entry too ---------------------------------------
alter table public.media add column if not exists entry_id uuid
  references public.coaching_entries (id) on delete cascade;
alter table public.media drop constraint if exists media_one_parent;
alter table public.media add constraint media_one_parent check (
  (post_id is not null)::int + (checkin_id is not null)::int
    + (entry_id is not null)::int = 1
);

-- ---- indexes ----------------------------------------------------------------
create index if not exists idx_coaching_trackers_rel
  on public.coaching_trackers (relationship_id, sort_order);
create index if not exists idx_coaching_entries_rel_time
  on public.coaching_entries (relationship_id, happened_at desc);
create index if not exists idx_coaching_entries_client_time
  on public.coaching_entries (client_id, happened_at desc);
create index if not exists idx_media_entry on public.media (entry_id);

-- ---- helper predicates (SECURITY DEFINER to avoid RLS recursion) ------------
create or replace function public.in_relationship(rel uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coaching_relationships r
    where r.id = rel and (r.coach_id = auth.uid() or r.client_id = auth.uid())
  );
$$;
create or replace function public.is_coach_of_rel(rel uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coaching_relationships r
    where r.id = rel and r.coach_id = auth.uid()
  );
$$;
create or replace function public.is_client_of_rel(rel uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coaching_relationships r
    where r.id = rel and r.client_id = auth.uid()
  );
$$;
grant execute on function public.in_relationship(uuid) to authenticated;
grant execute on function public.is_coach_of_rel(uuid) to authenticated;
grant execute on function public.is_client_of_rel(uuid) to authenticated;

-- ---- RLS --------------------------------------------------------------------
alter table public.coaching_trackers  enable row level security;
alter table public.coaching_entries   enable row level security;
alter table public.coaching_feedback  enable row level security;
alter table public.coaching_reminders enable row level security;

drop policy if exists coaching_trackers_select on public.coaching_trackers;
create policy coaching_trackers_select on public.coaching_trackers
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists coaching_trackers_write on public.coaching_trackers;
create policy coaching_trackers_write on public.coaching_trackers
  for all to authenticated
  using (public.is_coach_of_rel(relationship_id))
  with check (public.is_coach_of_rel(relationship_id));

drop policy if exists coaching_entries_select on public.coaching_entries;
create policy coaching_entries_select on public.coaching_entries
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists coaching_entries_write on public.coaching_entries;
create policy coaching_entries_write on public.coaching_entries
  for all to authenticated
  using (client_id = auth.uid() and public.is_client_of_rel(relationship_id))
  with check (client_id = auth.uid() and public.is_client_of_rel(relationship_id));

drop policy if exists coaching_feedback_select on public.coaching_feedback;
create policy coaching_feedback_select on public.coaching_feedback
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists coaching_feedback_write on public.coaching_feedback;
create policy coaching_feedback_write on public.coaching_feedback
  for all to authenticated
  using (public.is_coach_of_rel(relationship_id))
  with check (public.is_coach_of_rel(relationship_id) and coach_id = auth.uid());

drop policy if exists coaching_reminders_select on public.coaching_reminders;
create policy coaching_reminders_select on public.coaching_reminders
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists coaching_reminders_write on public.coaching_reminders;
create policy coaching_reminders_write on public.coaching_reminders
  for all to authenticated
  using (public.is_coach_of_rel(relationship_id))
  with check (public.is_coach_of_rel(relationship_id));

-- media SELECT: add the entry branch (coach or client of the entry).
drop policy if exists media_select on public.media;
create policy media_select on public.media
  for select to authenticated using (
    (post_id is not null and exists (
      select 1 from public.group_posts p
      where p.id = post_id and public.is_group_member(p.group_id)
    ))
    or (checkin_id is not null and exists (
      select 1 from public.checkins c
      join public.coaching_relationships r on r.id = c.relationship_id
      where c.id = checkin_id
        and (r.coach_id = auth.uid() or r.client_id = auth.uid())
    ))
    or (entry_id is not null and exists (
      select 1 from public.coaching_entries e
      join public.coaching_relationships r on r.id = e.relationship_id
      where e.id = entry_id
        and (r.coach_id = auth.uid() or r.client_id = auth.uid())
    ))
  );

-- Storage read: let the coach (and client) read the client's entry photos.
drop policy if exists media_group_read on storage.objects;
create policy media_group_read on storage.objects
  for select to authenticated using (
    bucket_id = 'media' and (
      exists (
        select 1 from public.media m
        join public.group_posts p on p.id = m.post_id
        where m.storage_path = name and public.is_group_member(p.group_id)
      )
      or exists (
        select 1 from public.media m
        join public.checkins c on c.id = m.checkin_id
        join public.coaching_relationships r on r.id = c.relationship_id
        where m.storage_path = name
          and (r.coach_id = auth.uid() or r.client_id = auth.uid())
      )
      or exists (
        select 1 from public.media m
        join public.coaching_entries e on e.id = m.entry_id
        join public.coaching_relationships r on r.id = e.relationship_id
        where m.storage_path = name
          and (r.coach_id = auth.uid() or r.client_id = auth.uid())
      )
    )
  );

-- ---- start_coaching: create the relationship + seed default trackers --------
create or replace function public.start_coaching(client uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  rel_id uuid;
begin
  insert into public.coaching_relationships (coach_id, client_id)
  values (auth.uid(), client)
  on conflict (coach_id, client_id) do update set coach_id = excluded.coach_id
  returning id into rel_id;

  if not exists (
    select 1 from public.coaching_trackers where relationship_id = rel_id
  ) then
    insert into public.coaching_trackers
      (relationship_id, label, emoji, prompt, sort_order, repeatable, wants_photo, wants_note, wants_amount, unit, target)
    values
      (rel_id, 'Wake up',         '☀️', null,                    10, false, false, false, false, null, null),
      (rel_id, 'Meal',            '🍽️', 'What did you eat?',      20, true,  true,  true,  false, null, null),
      (rel_id, 'Water',           '💧', 'What did you drink?',    30, true,  false, true,  true,  'oz', 100),
      (rel_id, 'Exercise',        '🏋️', 'What did you do?',       40, true,  false, true,  false, null, null),
      (rel_id, 'Read',            '📖', 'What did you read?',     50, true,  false, true,  false, null, null),
      (rel_id, 'Podcast',         '🎧', 'What did you listen to?',60, true,  false, true,  false, null, null),
      (rel_id, 'Sleep',           '🌙', null,                    70, false, false, false, false, null, null),
      (rel_id, 'Progress selfie', '📸', null,                    80, false, true,  false, false, null, null),
      (rel_id, 'Weight',          '⚖️', null,                    90, false, false, false, true,  'lb', null);
  end if;

  return rel_id;
end;
$$;
grant execute on function public.start_coaching(uuid) to authenticated;

-- ############################################################################
-- ## coaching-macros.sql
-- ############################################################################

-- =============================================================================
-- Meal macros + saved-meals library. Depends on coaching.sql (the helper
-- predicates + coaching_entries). Safe to re-run.
-- =============================================================================

-- Macros on meal entries.
alter table public.coaching_entries add column if not exists calories int;
alter table public.coaching_entries add column if not exists protein_g numeric;
alter table public.coaching_entries add column if not exists carbs_g numeric;
alter table public.coaching_entries add column if not exists fat_g numeric;
alter table public.coaching_entries add column if not exists macros_source text; -- 'ai' | 'edited'
alter table public.coaching_entries add column if not exists items jsonb;

-- Which trackers get macro estimation (meals).
alter table public.coaching_trackers
  add column if not exists wants_macros boolean not null default false;
update public.coaching_trackers
  set wants_macros = true
  where label = 'Meal' and wants_macros = false;

-- Saved-meals library, per relationship.
create table if not exists public.coaching_saved_meals (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  client_id       uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  detail          text,
  calories        int,
  protein_g       numeric,
  carbs_g         numeric,
  fat_g           numeric,
  use_count       int not null default 0,
  last_used_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_saved_meals_rel
  on public.coaching_saved_meals (relationship_id, created_at desc);

alter table public.coaching_saved_meals enable row level security;
drop policy if exists saved_meals_select on public.coaching_saved_meals;
create policy saved_meals_select on public.coaching_saved_meals
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists saved_meals_write on public.coaching_saved_meals;
create policy saved_meals_write on public.coaching_saved_meals
  for all to authenticated
  using (client_id = auth.uid() and public.is_client_of_rel(relationship_id))
  with check (client_id = auth.uid() and public.is_client_of_rel(relationship_id));

-- ############################################################################
-- ## coaching-plans.sql
-- ############################################################################

-- =============================================================================
-- My Plan (Wave 1): client intake → coach-generated weekly plan → assigned to
-- the client's daily view. Depends on coaching.sql (relationships + helpers).
-- Safe to re-run.
-- =============================================================================

-- ---- intake: the client's submitted answers ---------------------------------
create table if not exists public.coaching_intakes (
  id                   uuid primary key default gen_random_uuid(),
  relationship_id      uuid not null references public.coaching_relationships (id) on delete cascade,
  client_id            uuid not null references public.profiles (id) on delete cascade,
  goals                text,
  current_weight       numeric,
  goal_weight          numeric,
  build                text,
  height               text,
  age                  int,
  activity_level       int,        -- 0..5
  diet_level           int,        -- 0..5
  diet_type            text,
  maintenance_calories int,
  train_days           int[],      -- ISO weekdays 1=Mon..7=Sun
  workout_types        text[],
  habits               jsonb,      -- [{ "name": "...", "cadence": "daily"|"3x"|"mon,wed" }]
  status               text not null default 'submitted', -- 'draft' | 'submitted'
  submitted_at         timestamptz not null default now()
);
create index if not exists idx_intakes_rel on public.coaching_intakes (relationship_id, submitted_at desc);

-- ---- plan: the generated / assigned week ------------------------------------
create table if not exists public.coaching_plans (
  id               uuid primary key default gen_random_uuid(),
  relationship_id  uuid not null references public.coaching_relationships (id) on delete cascade,
  client_id        uuid not null references public.profiles (id) on delete cascade,
  week_number      int not null default 1,
  status           text not null default 'draft', -- 'draft' | 'active' | 'archived'
  summary          text,
  diet_notes       text,
  calorie_target   int,
  protein_target   int,
  carbs_target     int,
  fat_target       int,
  water_target     int,
  example_day      jsonb,   -- [{ "meal": "Breakfast", "detail": "...", "calories": n, "protein_g": n }]
  train_days       int[],   -- ISO weekdays the client trains
  habits           jsonb,   -- resolved [{ "name": "...", "days": [1,3,5] }]
  created_at       timestamptz not null default now(),
  activated_at     timestamptz
);
create index if not exists idx_plans_rel on public.coaching_plans (relationship_id, created_at desc);
-- Carry the client's goal weight onto the plan (used by adjustments + seeds).
alter table public.coaching_plans add column if not exists goal_weight numeric;

-- ---- prescribed workouts, one row per weekday of the plan --------------------
create table if not exists public.coaching_plan_workouts (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.coaching_plans (id) on delete cascade,
  weekday    int not null,            -- ISO 1=Mon..7=Sun
  title      text not null,           -- "Push day", "Run — 3 mi", "Rest"
  kind       text not null default 'other', -- 'lift'|'run'|'cardio'|'rest'|'other'
  detail     text,
  exercises  jsonb,   -- [{ "name": "Bench Press", "sets": 4, "reps": "8", "cue": "..." }]
  sort_order int not null default 0
);
create index if not exists idx_plan_workouts on public.coaching_plan_workouts (plan_id, weekday);

-- ---- trackers get a weekly cadence (which days they're "due") ----------------
alter table public.coaching_trackers
  add column if not exists days int[]; -- ISO weekdays; null/empty = every day

-- ---- RLS --------------------------------------------------------------------
alter table public.coaching_intakes       enable row level security;
alter table public.coaching_plans         enable row level security;
alter table public.coaching_plan_workouts enable row level security;

drop policy if exists intakes_select on public.coaching_intakes;
create policy intakes_select on public.coaching_intakes
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists intakes_write on public.coaching_intakes;
create policy intakes_write on public.coaching_intakes
  for all to authenticated
  using (client_id = auth.uid() and public.is_client_of_rel(relationship_id))
  with check (client_id = auth.uid() and public.is_client_of_rel(relationship_id));

drop policy if exists plans_select on public.coaching_plans;
create policy plans_select on public.coaching_plans
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists plans_write on public.coaching_plans;
create policy plans_write on public.coaching_plans
  for all to authenticated
  using (public.is_coach_of_rel(relationship_id))
  with check (public.is_coach_of_rel(relationship_id));

drop policy if exists plan_workouts_select on public.coaching_plan_workouts;
create policy plan_workouts_select on public.coaching_plan_workouts
  for select to authenticated using (
    exists (
      select 1 from public.coaching_plans p
      where p.id = plan_id and public.in_relationship(p.relationship_id)
    )
  );
drop policy if exists plan_workouts_write on public.coaching_plan_workouts;
create policy plan_workouts_write on public.coaching_plan_workouts
  for all to authenticated using (
    exists (
      select 1 from public.coaching_plans p
      where p.id = plan_id and public.is_coach_of_rel(p.relationship_id)
    )
  ) with check (
    exists (
      select 1 from public.coaching_plans p
      where p.id = plan_id and public.is_coach_of_rel(p.relationship_id)
    )
  );

-- ---- tracker upsert + plan activation --------------------------------------
-- Insert-or-update a tracker by (relationship, label); leaves an existing
-- prompt intact and marks it active. Internal helper for activate_plan.
create or replace function public.upsert_tracker(
  p_rel uuid, p_label text, p_emoji text, p_prompt text,
  p_repeat boolean, p_photo boolean, p_note boolean, p_amount boolean,
  p_macros boolean, p_unit text, p_target numeric, p_days int[]
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.coaching_trackers
    set emoji = p_emoji, prompt = coalesce(prompt, p_prompt), repeatable = p_repeat,
        wants_photo = p_photo, wants_note = p_note, wants_amount = p_amount,
        wants_macros = p_macros, unit = p_unit, target = coalesce(p_target, target),
        days = p_days, active = true
    where relationship_id = p_rel and label = p_label;
  if not found then
    insert into public.coaching_trackers
      (relationship_id, label, emoji, prompt, repeatable, wants_photo, wants_note,
       wants_amount, wants_macros, unit, target, days, sort_order, active)
    values (p_rel, p_label, p_emoji, p_prompt, p_repeat, p_photo, p_note, p_amount,
       p_macros, p_unit, p_target, p_days,
       coalesce((select max(sort_order) + 10 from public.coaching_trackers where relationship_id = p_rel), 10),
       true);
  end if;
end;
$$;

-- Approve & assign a plan: activate it, archive the rest, and rebuild the
-- client's trackers (dailies + workout + habits) with each one's cadence days.
create or replace function public.activate_plan(p_plan uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_rel uuid; v_water int; v_train int[]; v_habits jsonb; h jsonb; want text[];
begin
  select relationship_id, water_target, train_days, habits
    into v_rel, v_water, v_train, v_habits
    from public.coaching_plans where id = p_plan;
  if v_rel is null then raise exception 'plan not found'; end if;
  if not public.is_coach_of_rel(v_rel) then raise exception 'not authorized'; end if;

  update public.coaching_plans set status = 'archived'
    where relationship_id = v_rel and id <> p_plan and status = 'active';
  update public.coaching_plans set status = 'active', activated_at = now()
    where id = p_plan;

  want := array['Weight','Progress selfie','Meal','Water','Workout'];
  perform public.upsert_tracker(v_rel,'Weight','⚖️',null,false,false,false,true,false,'lb',null,null);
  perform public.upsert_tracker(v_rel,'Progress selfie','📸',null,false,true,false,false,false,null,null,null);
  perform public.upsert_tracker(v_rel,'Meal','🍽️','What did you eat?',true,true,true,false,true,null,null,null);
  perform public.upsert_tracker(v_rel,'Water','💧','What did you drink?',true,false,true,true,false,'oz',v_water,null);
  perform public.upsert_tracker(v_rel,'Workout','🏋️','What did you do?',true,false,true,false,false,null,null,v_train);

  if v_habits is not null then
    for h in select * from jsonb_array_elements(v_habits) loop
      want := array_append(want, h->>'name');
      perform public.upsert_tracker(
        v_rel, h->>'name', '✅', null, true, false, true, false, false, null, null,
        (select array_agg((d)::int) from jsonb_array_elements_text(h->'days') d));
    end loop;
  end if;

  update public.coaching_trackers set active = false
    where relationship_id = v_rel and label <> all(want);
end;
$$;
grant execute on function public.activate_plan(uuid) to authenticated;

-- ############################################################################
-- ## coaching-workouts.sql
-- ############################################################################

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

-- ############################################################################
-- ## coaching-adjustments.sql
-- ############################################################################

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

-- ############################################################################
-- ## plan-feed.sql
-- ############################################################################

-- =============================================================================
-- Plan → Feed: a client's My Plan activity surfaces in the group feed as a
-- daily "plan recap" post that updates live as they log. Reuses group_posts so
-- reactions/comments/rendering all work. Weight + progress selfies are NEVER
-- auto-included (privacy) — those get an explicit "Share to feed" instead.
-- Depends on schema.sql + coaching.sql. Safe to re-run.
-- =============================================================================

-- Tag a post's origin + carry the structured recap. Manual posts are unchanged.
alter table public.group_posts
  add column if not exists source text not null default 'manual', -- 'manual' | 'plan'
  add column if not exists day date,        -- the local day a plan recap covers
  add column if not exists plan_items jsonb; -- { workouts, meals, habits } summary

-- One plan recap per person per day (the sync upserts into it).
create unique index if not exists uniq_plan_recap
  on public.group_posts (author_id, day)
  where source = 'plan';

create index if not exists idx_group_posts_source
  on public.group_posts (group_id, source, created_at desc);
