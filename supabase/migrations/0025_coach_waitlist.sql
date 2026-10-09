-- 0025_coach_waitlist.sql
-- Lead capture for the coach test group (athletxapp.com/coaches funnel).
-- Anyone may submit; nobody can read the list through the API (emails stay
-- private) — read it from the Supabase dashboard / service role.
--
-- Idempotent: safe to re-run.

create table if not exists public.coach_waitlist (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  school      text,
  level       text,          -- D2 | D3 | NAIA | JUCO | other
  role        text,          -- head | assistant | recruiting_coordinator | other
  notes       text,
  created_at  timestamptz not null default now()
);

-- One row per email (case-insensitive) so repeat submits don't pile up.
create unique index if not exists coach_waitlist_email_key
  on public.coach_waitlist (lower(email));

alter table public.coach_waitlist enable row level security;

-- Public funnel: anonymous and signed-in visitors may submit.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'coach_waitlist'
      and policyname = 'coach_waitlist_insert'
  ) then
    create policy "coach_waitlist_insert"
      on public.coach_waitlist
      for insert
      to anon, authenticated
      with check (true);
  end if;
end$$;

-- No SELECT/UPDATE/DELETE policy on purpose: RLS then denies all reads via the
-- anon/authenticated API keys. The owner reads submissions from the dashboard.
