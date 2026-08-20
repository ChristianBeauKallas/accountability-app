-- =============================================================================
-- Living feed: track when a post was last updated so plan recaps can bump to
-- the top of the feed each time the person logs. Backfills existing rows to
-- their created time so nothing jumps. Safe to re-run.
-- =============================================================================

alter table public.group_posts add column if not exists updated_at timestamptz;
update public.group_posts set updated_at = created_at where updated_at is null;
alter table public.group_posts alter column updated_at set default now();

create index if not exists idx_group_posts_updated
  on public.group_posts (group_id, updated_at desc);
