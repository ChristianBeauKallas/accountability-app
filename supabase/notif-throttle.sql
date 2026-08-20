-- =============================================================================
-- Notification throttle: remember when we last pushed the group about a
-- person's daily recap, so "every log" doesn't spam everyone. Safe to re-run.
-- =============================================================================

alter table public.group_posts add column if not exists notified_at timestamptz;
