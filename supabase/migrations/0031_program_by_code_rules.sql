-- 0031_program_by_code_rules.sql
-- Extend the public invite lookup so the member onboarding can show the
-- program's actual rules (days, minutes, hours, bonus) before they join.
-- Still only reachable with a valid invite code; never exposes members.
--
-- Idempotent: safe to re-run.

drop function if exists public.wl_program_by_code(text);

create function public.wl_program_by_code(p_code text)
returns table (
  id uuid,
  name text,
  days_goal int,
  mins_per_day int,
  bank_hours_per_month numeric,
  monthly_bonus_cents int
)
language sql stable security definer set search_path = public as $$
  select id, name, days_goal, mins_per_day, bank_hours_per_month, monthly_bonus_cents
  from public.wl_programs
  where invite_code = p_code;
$$;

grant execute on function public.wl_program_by_code(text) to anon, authenticated;
