-- =============================================================================
-- Draft plans for Beau, JT, and Jake. Coach = bkallas3@icloud.com.
--
-- HOW TO USE (per person):
--   1. In the app: Settings -> Coaching -> "Coach a teammate" -> [person] -> Start
--      (for Beau's own plan, use "Start my own plan").
--   2. Fill in that person's signup email below (Beau is already filled).
--   3. Run that person's block. It inserts a DRAFT plan.
--   4. In the app: My Team -> [person] -> Manage plan -> review -> Approve & assign.
--
-- Beau + JT share the exact training (3 runs + 3 SUPERSET lifts). Only the
-- nutrition targets differ (Beau maintains, JT cuts). Jake keeps straight-set
-- lifts + BJJ. Half-marathon paces are pegged to a 9:30/mi goal.
-- =============================================================================


-- #############################################################################
-- ## BEAU  (maintain weight · half-marathon Dec 6)  — self-coached
-- #############################################################################
with vars as (
  select
    'bkallas3@icloud.com'::text as client_email,
    2600::int as calorie_target, 175::int as protein_target,
    310::int as carbs_target, 75::int as fat_target, 130::int as water_target,
    null::numeric as goal_weight,
    'Maintain weight + half-marathon build for Dec 6. 3 runs (easy/tempo/long) + 3 superset lifts a week. Eat at maintenance, carbs timed around runs.'::text as summary,
    'Flexible/IIFYM at maintenance (~2,600). Keep protein steady, load carbs around Tue/Thu/Sat runs, eat a bit more on long-run day. Photo-log meals.'::text as diet_notes
),
ids as (
  select
    (select id from auth.users where lower(email) = (select lower(client_email) from vars)) as client_id,
    (select id from auth.users where lower(email) = 'bkallas3@icloud.com') as coach_id
),
rel as (
  select r.id as relationship_id, ids.client_id
  from public.coaching_relationships r, ids
  where r.coach_id = ids.coach_id and r.client_id = ids.client_id limit 1
),
new_plan as (
  insert into public.coaching_plans
    (relationship_id, client_id, week_number, status, summary, diet_notes,
     calorie_target, protein_target, carbs_target, fat_target, water_target, goal_weight,
     train_days, habits)
  select rel.relationship_id, rel.client_id, 1, 'draft',
    (select summary from vars), (select diet_notes from vars),
    (select calorie_target from vars), (select protein_target from vars),
    (select carbs_target from vars), (select fat_target from vars),
    (select water_target from vars), (select goal_weight from vars),
    '{1,2,3,4,5,6}',
    '[{"name":"Mobility - 10 min","days":[2,4,7]},
      {"name":"Read","days":[1,2,3,4,5,6,7],"check":true}]'::jsonb
  from rel
  returning id
)
insert into public.coaching_plan_workouts (plan_id, weekday, title, kind, detail, exercises, sort_order)
select np.id, w.weekday, w.title, w.kind, w.detail, w.exercises, w.weekday
from new_plan np, (values
  (1,'Lower (superset)','lift','1 compound + 3 supersets · ~50-60 min',
    '[{"name":"Back squat","sets":4,"reps":"6","cue":"compound - controlled, leave a rep in the tank"},
      {"name":"A1 · Romanian deadlift","sets":3,"reps":"8","cue":"superset A - hinge, load the hamstrings"},
      {"name":"A2 · Walking lunge","sets":3,"reps":"10","cue":"superset A - straight into it, long stride"},
      {"name":"B1 · Leg press","sets":3,"reps":"12","cue":"superset B - knees track your toes"},
      {"name":"B2 · Standing calf raise","sets":3,"reps":"15","cue":"superset B - full stretch, pause up"},
      {"name":"C1 · Hanging leg raise","sets":3,"reps":"12","cue":"superset C - slow, no swing"},
      {"name":"C2 · Plank","sets":3,"reps":"45 sec","cue":"superset C - ribs down, squeeze glutes"}]'::jsonb),
  (2,'Easy run','run','Conversational base run',
    '[{"name":"Easy run","sets":1,"reps":"4 miles easy @ 10:45-11:15/mi","cue":"you can talk in full sentences"}]'::jsonb),
  (3,'Push (superset)','lift','1 compound + 3 supersets · ~50-60 min',
    '[{"name":"Bench press","sets":4,"reps":"6","cue":"compound - full chest contact, controlled descent"},
      {"name":"A1 · Incline dumbbell press","sets":3,"reps":"8","cue":"superset A - deep stretch"},
      {"name":"A2 · Lateral raise","sets":3,"reps":"15","cue":"superset A - lead with the elbows"},
      {"name":"B1 · Overhead press","sets":3,"reps":"8","cue":"superset B - core tight, no arch"},
      {"name":"B2 · Triceps pushdown","sets":3,"reps":"12","cue":"superset B - keep elbows pinned"},
      {"name":"C1 · Cable fly","sets":3,"reps":"12","cue":"superset C - squeeze at the center"},
      {"name":"C2 · Face pull","sets":3,"reps":"15","cue":"superset C - posture for running"}]'::jsonb),
  (4,'Tempo run','run','Quality - race-pace work',
    '[{"name":"Warm-up","sets":1,"reps":"1 mile easy","cue":"ease in"},
      {"name":"Tempo","sets":1,"reps":"3 miles @ 9:00-9:10/mi","cue":"comfortably hard, controlled breathing"},
      {"name":"Cool-down","sets":1,"reps":"1 mile easy","cue":"shake it out"}]'::jsonb),
  (5,'Pull (superset)','lift','1 compound + 3 supersets · ~50-60 min',
    '[{"name":"Barbell row","sets":4,"reps":"6","cue":"compound - flat back, drive the elbows"},
      {"name":"A1 · Lat pulldown","sets":3,"reps":"10","cue":"superset A - elbows to your hips"},
      {"name":"A2 · Chest-supported row","sets":3,"reps":"10","cue":"superset A - squeeze the back"},
      {"name":"B1 · Face pull","sets":3,"reps":"15","cue":"superset B - pull to your eyes"},
      {"name":"B2 · Hammer curl","sets":3,"reps":"12","cue":"superset B - no swinging"},
      {"name":"C1 · Rear delt fly","sets":3,"reps":"15","cue":"superset C - soft elbows"},
      {"name":"C2 · EZ-bar curl","sets":3,"reps":"12","cue":"superset C - controlled"}]'::jsonb),
  (6,'Long run','run','The priority session - steady + easy',
    '[{"name":"Long run","sets":1,"reps":"6 miles easy @ 10:30-11:00/mi","cue":"steady aerobic pace - fuel and hydrate"}]'::jsonb),
  (7,'Rest','rest','Recovery walk + mobility - weigh-in + progress photo', null::jsonb)
) as w(weekday,title,kind,detail,exercises);


-- #############################################################################
-- ## JT  (lose 15 lb: 220 -> 205 · half-marathon Dec 6)
-- ## Fill in JT's signup email on the client_email line.
-- #############################################################################
with vars as (
  select
    'JT_EMAIL_HERE'::text as client_email,
    2100::int as calorie_target, 175::int as protein_target,
    210::int as carbs_target, 60::int as fat_target, 130::int as water_target,
    205::numeric as goal_weight,
    'Half-marathon build for Dec 6 + drop to 205. 3 runs (easy/tempo/long) + 3 superset lifts a week. Runs come first. ~2,100 cal with carbs timed around runs.'::text as summary,
    'IIFYM - hit ~175P / 210C / 60F (~2,100 cal). Carbs fuel the running, so load more around Tue/Thu/Sat runs and eat a little more on long-run day. Keep protein steady to hold muscle in the cut. Photo-log meals.'::text as diet_notes
),
ids as (
  select
    (select id from auth.users where lower(email) = (select lower(client_email) from vars)) as client_id,
    (select id from auth.users where lower(email) = 'bkallas3@icloud.com') as coach_id
),
rel as (
  select r.id as relationship_id, ids.client_id
  from public.coaching_relationships r, ids
  where r.coach_id = ids.coach_id and r.client_id = ids.client_id limit 1
),
new_plan as (
  insert into public.coaching_plans
    (relationship_id, client_id, week_number, status, summary, diet_notes,
     calorie_target, protein_target, carbs_target, fat_target, water_target, goal_weight,
     train_days, habits)
  select rel.relationship_id, rel.client_id, 1, 'draft',
    (select summary from vars), (select diet_notes from vars),
    (select calorie_target from vars), (select protein_target from vars),
    (select carbs_target from vars), (select fat_target from vars),
    (select water_target from vars), (select goal_weight from vars),
    '{1,2,3,4,5,6}',
    '[{"name":"Mobility - 10 min","days":[2,4,7]},
      {"name":"Read","days":[1,2,3,4,5,6,7],"check":true}]'::jsonb
  from rel
  returning id
)
insert into public.coaching_plan_workouts (plan_id, weekday, title, kind, detail, exercises, sort_order)
select np.id, w.weekday, w.title, w.kind, w.detail, w.exercises, w.weekday
from new_plan np, (values
  (1,'Lower (superset)','lift','1 compound + 3 supersets · ~50-60 min',
    '[{"name":"Back squat","sets":4,"reps":"6","cue":"compound - controlled, leave a rep in the tank"},
      {"name":"A1 · Romanian deadlift","sets":3,"reps":"8","cue":"superset A - hinge, load the hamstrings"},
      {"name":"A2 · Walking lunge","sets":3,"reps":"10","cue":"superset A - straight into it, long stride"},
      {"name":"B1 · Leg press","sets":3,"reps":"12","cue":"superset B - knees track your toes"},
      {"name":"B2 · Standing calf raise","sets":3,"reps":"15","cue":"superset B - full stretch, pause up"},
      {"name":"C1 · Hanging leg raise","sets":3,"reps":"12","cue":"superset C - slow, no swing"},
      {"name":"C2 · Plank","sets":3,"reps":"45 sec","cue":"superset C - ribs down, squeeze glutes"}]'::jsonb),
  (2,'Easy run','run','Conversational base run',
    '[{"name":"Easy run","sets":1,"reps":"4 miles easy @ 10:45-11:15/mi","cue":"you can talk in full sentences"}]'::jsonb),
  (3,'Push (superset)','lift','1 compound + 3 supersets · ~50-60 min',
    '[{"name":"Bench press","sets":4,"reps":"6","cue":"compound - full chest contact, controlled descent"},
      {"name":"A1 · Incline dumbbell press","sets":3,"reps":"8","cue":"superset A - deep stretch"},
      {"name":"A2 · Lateral raise","sets":3,"reps":"15","cue":"superset A - lead with the elbows"},
      {"name":"B1 · Overhead press","sets":3,"reps":"8","cue":"superset B - core tight, no arch"},
      {"name":"B2 · Triceps pushdown","sets":3,"reps":"12","cue":"superset B - keep elbows pinned"},
      {"name":"C1 · Cable fly","sets":3,"reps":"12","cue":"superset C - squeeze at the center"},
      {"name":"C2 · Face pull","sets":3,"reps":"15","cue":"superset C - posture for running"}]'::jsonb),
  (4,'Tempo run','run','Quality - race-pace work',
    '[{"name":"Warm-up","sets":1,"reps":"1 mile easy","cue":"ease in"},
      {"name":"Tempo","sets":1,"reps":"3 miles @ 9:00-9:10/mi","cue":"comfortably hard, controlled breathing"},
      {"name":"Cool-down","sets":1,"reps":"1 mile easy","cue":"shake it out"}]'::jsonb),
  (5,'Pull (superset)','lift','1 compound + 3 supersets · ~50-60 min',
    '[{"name":"Barbell row","sets":4,"reps":"6","cue":"compound - flat back, drive the elbows"},
      {"name":"A1 · Lat pulldown","sets":3,"reps":"10","cue":"superset A - elbows to your hips"},
      {"name":"A2 · Chest-supported row","sets":3,"reps":"10","cue":"superset A - squeeze the back"},
      {"name":"B1 · Face pull","sets":3,"reps":"15","cue":"superset B - pull to your eyes"},
      {"name":"B2 · Hammer curl","sets":3,"reps":"12","cue":"superset B - no swinging"},
      {"name":"C1 · Rear delt fly","sets":3,"reps":"15","cue":"superset C - soft elbows"},
      {"name":"C2 · EZ-bar curl","sets":3,"reps":"12","cue":"superset C - controlled"}]'::jsonb),
  (6,'Long run','run','The priority session - steady + easy',
    '[{"name":"Long run","sets":1,"reps":"6 miles easy @ 10:30-11:00/mi","cue":"steady aerobic pace - fuel and hydrate"}]'::jsonb),
  (7,'Rest','rest','Recovery walk + mobility - weigh-in + progress photo', null::jsonb)
) as w(weekday,title,kind,detail,exercises);


-- #############################################################################
-- ## JAKE  (200 -> 165 by Jan 1 · 4 lifts + BJJ · straight sets)
-- ## Fill in Jake's signup email on the client_email line.
-- #############################################################################
with vars as (
  select
    'JAKE_EMAIL_HERE'::text as client_email,
    2000::int as calorie_target, 190::int as protein_target,
    160::int as carbs_target, 65::int as fat_target, 120::int as water_target,
    165::numeric as goal_weight,
    'Cut to 165 by Jan 1 - 4 lifts/week, BJJ, 8k steps daily, ~2,000 cal at 190g protein. Legs Mon/Fri, upper Tue/Thu, weekends light.'::text as summary,
    '~2,000 cal, ~190g protein (40-50g per meal). Lean proteins, plenty of veggies, carbs around training and before BJJ. 120 oz water. Photo-log every meal.'::text as diet_notes
),
ids as (
  select
    (select id from auth.users where lower(email) = (select lower(client_email) from vars)) as client_id,
    (select id from auth.users where lower(email) = 'bkallas3@icloud.com') as coach_id
),
rel as (
  select r.id as relationship_id, ids.client_id
  from public.coaching_relationships r, ids
  where r.coach_id = ids.coach_id and r.client_id = ids.client_id limit 1
),
new_plan as (
  insert into public.coaching_plans
    (relationship_id, client_id, week_number, status, summary, diet_notes,
     calorie_target, protein_target, carbs_target, fat_target, water_target, goal_weight,
     train_days, habits)
  select rel.relationship_id, rel.client_id, 1, 'draft',
    (select summary from vars), (select diet_notes from vars),
    (select calorie_target from vars), (select protein_target from vars),
    (select carbs_target from vars), (select fat_target from vars),
    (select water_target from vars), (select goal_weight from vars),
    '{1,2,4,5}',
    '[{"name":"Steps (8k)","days":[1,2,3,4,5,6,7]},
      {"name":"Read - Bible + leadership","days":[1,2,3,4,5,6,7]},
      {"name":"Dev book - 2 chapters","days":[1,4]},
      {"name":"Jiu-jitsu","days":[2,4]}]'::jsonb
  from rel
  returning id
)
insert into public.coaching_plan_workouts (plan_id, weekday, title, kind, detail, exercises, sort_order)
select np.id, w.weekday, w.title, w.kind, w.detail, w.exercises, w.weekday
from new_plan np, (values
  (1,'Lower','lift', null::text,
    '[{"name":"Back squat","sets":4,"reps":"6-8","cue":"brace, sit between the hips"},
      {"name":"Romanian deadlift","sets":3,"reps":"8-10","cue":"hinge, feel the hamstrings"},
      {"name":"Walking lunge","sets":3,"reps":"10","cue":"long stride, tall chest"},
      {"name":"Seated leg curl","sets":3,"reps":"12","cue":"slow negative"},
      {"name":"Standing calf raise","sets":3,"reps":"15","cue":"full stretch, pause at top"}]'::jsonb),
  (2,'Push','lift','BJJ 6 AM',
    '[{"name":"Bench press","sets":4,"reps":"6-8","cue":"full chest contact, controlled descent"},
      {"name":"Overhead press","sets":3,"reps":"8","cue":"core tight, no arch"},
      {"name":"Incline dumbbell press","sets":3,"reps":"10","cue":"deep stretch"},
      {"name":"Lateral raise","sets":3,"reps":"15","cue":"lead with the elbows"},
      {"name":"Triceps pushdown","sets":3,"reps":"12","cue":"keep elbows pinned"}]'::jsonb),
  (3,'Rest','rest','Recovery - hit 8k steps', null::jsonb),
  (4,'Pull','lift','BJJ 6 AM',
    '[{"name":"Lat pulldown","sets":4,"reps":"8","cue":"drive elbows to your hips"},
      {"name":"Chest-supported row","sets":4,"reps":"10","cue":"squeeze the shoulder blades"},
      {"name":"Face pull","sets":3,"reps":"15","cue":"pull to your eyes"},
      {"name":"Hammer curl","sets":3,"reps":"12","cue":"no swinging"},
      {"name":"Rear delt fly","sets":3,"reps":"15","cue":"soft elbows"}]'::jsonb),
  (5,'Lower','lift', null,
    '[{"name":"Deadlift","sets":4,"reps":"5","cue":"flat back, push the floor away"},
      {"name":"Bulgarian split squat","sets":3,"reps":"8","cue":"stay upright"},
      {"name":"Leg press","sets":3,"reps":"12","cue":"knees track your toes"},
      {"name":"Hip thrust","sets":3,"reps":"10","cue":"chin tucked, squeeze at top"},
      {"name":"Hanging leg raise","sets":3,"reps":"12","cue":"slow, no swing"}]'::jsonb),
  (6,'Arms + conditioning','other','Quick pump + steps',
    '[{"name":"EZ-bar curl","sets":3,"reps":"12","cue":"controlled"},
      {"name":"Overhead triceps extension","sets":3,"reps":"12","cue":"full stretch"},
      {"name":"Incline walk","sets":1,"reps":"20 min","cue":"brisk, zone 2"}]'::jsonb),
  (7,'Rest','rest','Recovery walk - weigh-in + progress photo', null::jsonb)
) as w(weekday,title,kind,detail,exercises);
