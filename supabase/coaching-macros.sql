-- =============================================================================
-- Meal macros + saved-meals library. Depends on coaching.sql (the helper
-- predicates + coaching_entries). Safe to re-run.
-- =============================================================================

-- Macros on meal entries.
alter table public.coaching_entries add column if not exists calories int;
alter table public.coaching_entries add column if not exists protein_g numeric;
alter table public.coaching_entries add column if not exists carbs_g numeric;
alter table public.coaching_entries add column if not exists fat_g numeric;
alter table public.coaching_entries add column if not exists macros_source text; -- 'ai' | 'edited'
alter table public.coaching_entries add column if not exists items jsonb;

-- Which trackers get macro estimation (meals).
alter table public.coaching_trackers
  add column if not exists wants_macros boolean not null default false;
update public.coaching_trackers
  set wants_macros = true
  where label = 'Meal' and wants_macros = false;

-- Saved-meals library, per relationship.
create table if not exists public.coaching_saved_meals (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  client_id       uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  detail          text,
  calories        int,
  protein_g       numeric,
  carbs_g         numeric,
  fat_g           numeric,
  use_count       int not null default 0,
  last_used_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_saved_meals_rel
  on public.coaching_saved_meals (relationship_id, created_at desc);

alter table public.coaching_saved_meals enable row level security;
drop policy if exists saved_meals_select on public.coaching_saved_meals;
create policy saved_meals_select on public.coaching_saved_meals
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists saved_meals_write on public.coaching_saved_meals;
create policy saved_meals_write on public.coaching_saved_meals
  for all to authenticated
  using (client_id = auth.uid() and public.is_client_of_rel(relationship_id))
  with check (client_id = auth.uid() and public.is_client_of_rel(relationship_id));
