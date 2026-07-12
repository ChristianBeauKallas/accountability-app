-- ============================================================================
-- Pre-fill voice prompts for your activities based on their names.
-- Tailors common areas, defaults the rest to "What did you do for {name}?".
-- Only fills EMPTY prompts, so it never overwrites ones you've customized.
-- Run in: Supabase Dashboard → SQL Editor. Safe to run more than once.
-- (Run schema.sql first so the `prompt` column exists.)
-- ============================================================================
update public.activities
set prompt = case
  when name ~* 'mov|exercis|workout|train|fitness|run|walk|gym|lift|cardio'
    then 'What movement did you get in today?'
  when name ~* 'eat|food|nutrition|clean|diet|meal|macros'
    then 'How did you eat today?'
  when name ~* 'water|hydrat'
    then 'Did you get your water in?'
  when name ~* 'sleep|rest|recover'
    then 'How did you sleep last night?'
  when name ~* 'read|learn|book|study|grow|podcast'
    then 'What did you read or learn?'
  when name ~* 'connect|relationship|friend|family|social|reach|call|text'
    then 'Who did you connect with today?'
  when name ~* 'pray|faith|spirit|meditat|gratitude|journal|mind|mental|reflect'
    then 'How did you invest in your mind or spirit?'
  when name ~* 'work|hustle|business|goal|deep|focus|produc|grind'
    then 'What did you get done today?'
  when name ~* 'money|budget|finance|sav|invest'
    then 'How did you handle money today?'
  else 'What did you do for ' || name || '?'
end
where active and (prompt is null or prompt = '');
