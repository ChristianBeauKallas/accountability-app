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
