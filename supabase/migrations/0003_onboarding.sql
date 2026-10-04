-- Athletx — Phase 3: onboarding completion flag
alter table public.profiles
  add column if not exists onboarded boolean not null default false;
