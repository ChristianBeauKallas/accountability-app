-- =============================================================================
-- Support check-only habits: a plan habit with "check": true becomes a simple
-- one-tap checkmark (no note field, once/day). Redefines activate_plan.
-- Depends on coaching.sql + coaching-plans.sql. Safe to re-run.
-- =============================================================================

create or replace function public.activate_plan(p_plan uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_rel uuid; v_water int; v_train int[]; v_habits jsonb; h jsonb; want text[];
  v_check boolean;
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

  -- Daily staples: weigh-in + progress selfie + meals + water + workout.
  want := array['Weight','Progress selfie','Meal','Water','Workout'];
  perform public.upsert_tracker(v_rel,'Weight','⚖️',null,false,false,false,true,false,'lb',null,null);
  perform public.upsert_tracker(v_rel,'Progress selfie','📸',null,false,true,false,false,false,null,null,null);
  perform public.upsert_tracker(v_rel,'Meal','🍽️','What did you eat?',true,true,true,false,true,null,null,null);
  perform public.upsert_tracker(v_rel,'Water','💧','What did you drink?',true,false,true,true,false,'oz',v_water,null);
  perform public.upsert_tracker(v_rel,'Workout','🏋️','What did you do?',true,false,true,false,false,null,null,v_train);

  if v_habits is not null then
    for h in select * from jsonb_array_elements(v_habits) loop
      want := array_append(want, h->>'name');
      v_check := coalesce((h->>'check')::boolean, false);
      -- check-only: once/day, no note. otherwise: repeatable with a note field.
      perform public.upsert_tracker(
        v_rel, h->>'name', '✅', null,
        not v_check,   -- repeatable
        false,         -- wants_photo
        not v_check,   -- wants_note
        false, false, null, null,
        (select array_agg((d)::int) from jsonb_array_elements_text(h->'days') d));
    end loop;
  end if;

  update public.coaching_trackers set active = false
    where relationship_id = v_rel and label <> all(want);
end;
$$;
grant execute on function public.activate_plan(uuid) to authenticated;
