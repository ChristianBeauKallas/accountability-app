-- =============================================================================
-- Plan revisions: mark which trackers the client added themselves so that
-- rebuilding/activating a new plan preserves them (activate_plan deactivates
-- any tracker not in the new plan's list). Safe to re-run.
-- =============================================================================

alter table public.coaching_trackers
  add column if not exists source text not null default 'plan';
-- 'plan'  → created by the plan (managed by activate_plan)
-- 'user'  → added by the client via Edit habits (preserved across rebuilds)
