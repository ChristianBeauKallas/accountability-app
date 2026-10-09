-- 0026_waitlist.sql
-- Unified waitlist for both sides of the marketplace (coaches and players),
-- replacing the coach-only 0025 table. Anyone may submit; nobody can read the
-- list through the API (contact info stays private) — read it from the
-- Supabase dashboard / service role.
--
-- Idempotent: safe to re-run.

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('coach', 'player')),
  name        text not null,
  email       text not null,
  school      text,
  level       text,          -- coach: D2/D3/NAIA/JUCO; player: high_school/juco/four_year
  role        text,          -- coach: head/assistant/recruiting_coordinator/other
  position    text,          -- player: primary position
  grad_year   int,           -- player: graduation year
  notes       text,
  created_at  timestamptz not null default now()
);

-- One row per email per side.
create unique index if not exists waitlist_kind_email_key
  on public.waitlist (kind, lower(email));

alter table public.waitlist enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'waitlist'
      and policyname = 'waitlist_insert'
  ) then
    create policy "waitlist_insert"
      on public.waitlist
      for insert
      to anon, authenticated
      with check (true);
  end if;
end$$;

-- Fold any earlier coach_waitlist rows (from migration 0025) into the unified
-- table, then retire that table.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'coach_waitlist'
  ) then
    insert into public.waitlist (kind, name, email, school, level, role, notes, created_at)
      select 'coach', name, email, school, level, role, notes, created_at
      from public.coach_waitlist
      on conflict do nothing;
    drop table public.coach_waitlist;
  end if;
end$$;

-- No SELECT/UPDATE/DELETE policy on purpose: RLS then denies all reads via the
-- anon/authenticated API keys. The owner reads submissions from the dashboard.
