-- =============================================================================
-- Hourly reminder scheduler (pg_cron + pg_net).
--
-- Runs GET /api/reminders once an hour. That endpoint is timezone-aware and
-- self-deduping: meal nudges fire at each member's local 9am / 1pm / 7pm, and
-- the dead-group nudge at local 8pm — so one hourly tick covers everyone.
--
-- Vercel's free tier caps cron at 1 run/day, which can't do hourly. Supabase's
-- pg_cron can, so we schedule it from Postgres instead.
--
-- ---- SETUP (run once, in the Supabase SQL editor) --------------------------
-- 1. Set two config values below to YOUR values, then run the whole file.
--      • app_url      → your deployed origin, e.g. https://npsf.vercel.app
--      • cron_secret  → the same value as the CRON_SECRET env var in Vercel
--        (set CRON_SECRET in Vercel first; if you leave it unset, remove the
--         Authorization header line below and the endpoint stays open).
-- 2. Re-running this file is safe — it unschedules the old job first.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Stash the two settings in Postgres so the job body can read them.
-- Replace the two values on the next lines:
select set_config('app.reminder_url',    'https://YOUR-APP.vercel.app/api/reminders', false);
select set_config('app.reminder_secret', 'YOUR_CRON_SECRET', false);

-- pg_cron doesn't see set_config from another session, so we bake the values
-- straight into the scheduled command. Edit the URL + secret here too:
select cron.unschedule('gb-hourly-reminders')
  where exists (select 1 from cron.job where jobname = 'gb-hourly-reminders');

select cron.schedule(
  'gb-hourly-reminders',
  '0 * * * *',                       -- top of every hour (UTC)
  $$
  select net.http_get(
    url     := 'https://YOUR-APP.vercel.app/api/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
  );
  $$
);

-- ---- VERIFY -----------------------------------------------------------------
-- select jobname, schedule, active from cron.job;
-- select * from cron.job_run_details order by start_time desc limit 5;

-- ---- ALTERNATIVE: external scheduler (no pg_cron) ---------------------------
-- If you'd rather not use pg_cron, create a free hourly job at cron-job.org:
--   • URL:      https://YOUR-APP.vercel.app/api/reminders
--   • Schedule: every hour, minute 0
--   • Header:   Authorization: Bearer YOUR_CRON_SECRET
-- =============================================================================
