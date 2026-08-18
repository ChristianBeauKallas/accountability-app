-- =============================================================================
-- Plan → Feed: a client's My Plan activity surfaces in the group feed as a
-- daily "plan recap" post that updates live as they log. Reuses group_posts so
-- reactions/comments/rendering all work. Weight + progress selfies are NEVER
-- auto-included (privacy) — those get an explicit "Share to feed" instead.
-- Depends on schema.sql + coaching.sql. Safe to re-run.
-- =============================================================================

-- Tag a post's origin + carry the structured recap. Manual posts are unchanged.
alter table public.group_posts
  add column if not exists source text not null default 'manual', -- 'manual' | 'plan'
  add column if not exists day date,        -- the local day a plan recap covers
  add column if not exists plan_items jsonb; -- { workouts, meals, habits } summary

-- One plan recap per person per day (the sync upserts into it).
create unique index if not exists uniq_plan_recap
  on public.group_posts (author_id, day)
  where source = 'plan';

create index if not exists idx_group_posts_source
  on public.group_posts (group_id, source, created_at desc);
