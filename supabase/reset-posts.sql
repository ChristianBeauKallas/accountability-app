-- ============================================================================
-- Reset all POST data — start everyone from scratch, but KEEP users, groups,
-- memberships, and activities. Streaks/board/feed reset to empty.
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- ============================================================================

-- Clears every feed post and its children (reactions, comments, logged
-- activities, and post-attached media). CASCADE handles FK order.
truncate table
  public.post_reactions,
  public.comments,
  public.post_activities,
  public.media,
  public.group_posts
restart identity cascade;

-- (Optional) also wipe the chat history. Uncomment if you want that cleared too.
-- truncate table public.messages restart identity cascade;

-- (Optional) remove uploaded post/chat files. Safe to skip — new uploads use
-- fresh UUID paths and won't collide. Leaves avatars alone.
-- delete from storage.objects where bucket_id = 'media';
