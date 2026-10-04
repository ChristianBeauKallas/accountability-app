-- ============================================================================
-- Athletx — FULL RESET  ⚠️ DESTRUCTIVE / IRREVERSIBLE
-- ============================================================================
-- Run this FIRST, only when you want to wipe an existing Supabase project
-- (e.g. the old "Get Better" app) and hand it over to Athletx.
--
-- It will PERMANENTLY DELETE:
--   • every table, view, function, trigger and type in the `public` schema
--     (all old app data)
--   • every auth user and their sessions/identities (everyone is logged out
--     and their accounts are gone)
--   • (optional) all Storage files
--
-- There is no undo. Take a backup first if there's any chance you want it.
--
-- After this runs, apply in order:
--   migrations/0001_schema.sql
--   migrations/0002_rls.sql
--   migrations/0003_onboarding.sql
--   seed.sql
-- ============================================================================

-- 1. Nuke the entire public schema (drops old tables, the old
--    handle_new_user() function, and — via cascade — the old
--    on_auth_user_created trigger that depended on it).
drop schema if exists public cascade;
create schema public;

-- 2. Restore the standard Supabase grants on the fresh public schema.
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
comment on schema public is 'standard public schema';

-- 3. Delete all auth users (cascades to identities, sessions, refresh tokens).
delete from auth.users;

-- 4. OPTIONAL — also wipe Storage. Uncomment if you used Storage in the old
--    app and want those files gone too.
-- delete from storage.objects;
-- delete from storage.buckets;
