-- =============================================================================
-- Remember a client's equipment so workouts can be fitted to it without them
-- re-describing it every day. The client owns/edits their own profile, so no
-- new policy is needed. Safe to re-run.
-- =============================================================================

alter table public.profiles add column if not exists equipment text;
