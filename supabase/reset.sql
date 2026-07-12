-- ============================================================================
-- DANGER: full data wipe for testing a clean first-run.
-- Deletes ALL rows and ALL users. Keeps your tables/schema intact.
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- ============================================================================

-- 1) Clear every app table (CASCADE handles child rows / FK order).
truncate table
  public.post_reactions,
  public.comments,
  public.post_activities,
  public.media,
  public.group_posts,
  public.messages,
  public.push_subscriptions,
  public.checkins,
  public.coaching_relationships,
  public.activities,
  public.group_members,
  public.groups,
  public.profiles
restart identity cascade;

-- 2) Remove all auth users so emails are free to sign up again.
delete from auth.users;

-- 3) (Optional) Clear uploaded files' records for avatars + chat/post media.
--    Safe to skip — new uploads use fresh UUID paths and won't collide.
delete from storage.objects where bucket_id in ('media', 'avatars');
