-- Run this in the Supabase Dashboard -> SQL Editor to create the example
-- table that app/page.tsx reads from.

create table if not exists public.goals (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Row Level Security is ON by default for new tables. Because this starter
-- has no auth yet, we add a policy that allows anyone with the anon key to
-- READ rows. This makes the demo work out of the box.
--
-- IMPORTANT: this is fine for public, non-sensitive demo data only. Once you
-- add Supabase Auth, replace this with policies scoped to auth.uid() so users
-- only see their own goals, and drop this open read policy.
alter table public.goals enable row level security;

create policy "Public read access to goals"
  on public.goals
  for select
  using (true);

-- A couple of example rows so the homepage isn't empty.
insert into public.goals (title, description) values
  ('Ship the MVP', 'Get the first version deployed to Vercel this week.'),
  ('Exercise 3x/week', 'Mon / Wed / Fri — no excuses.');
