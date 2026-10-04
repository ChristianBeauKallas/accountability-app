-- Athletx — Phase 4: let a player read any need they've applied to
-- (so the Tracker still shows a need after it's closed). SECURITY DEFINER
-- avoids RLS recursion between needs and applications.

create or replace function public.player_applied_to_need(p_need uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a
    where a.need_id = p_need and a.player_id = auth.uid()
  );
$$;

drop policy if exists needs_select_applied on public.needs;
create policy needs_select_applied on public.needs
  for select using (public.player_applied_to_need(id));
