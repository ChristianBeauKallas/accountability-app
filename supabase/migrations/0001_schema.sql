-- Athletx — Phase 2 schema
-- Tables: profiles, players, programs, program_staff, needs, applications,
-- messages, notifications. RLS policies live in 0002_rls.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('player', 'coach');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.division as enum ('D2', 'D3', 'NAIA', 'JUCO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.staff_role as enum ('head', 'assistant', 'recruiting_coordinator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.need_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum ('new', 'viewed', 'interested', 'closed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'player',
  full_name   text not null default '',
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- players — player-specific profile (1:1 with a profile)
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id             uuid primary key references public.profiles (id) on delete cascade,
  grad_year      int,
  primary_position text,
  positions      text[] not null default '{}',
  bats           text,        -- 'L' | 'R' | 'S'
  throws         text,        -- 'L' | 'R'
  height_in      int,
  weight_lb      int,
  gpa            numeric(3,2),
  city           text,
  state          text,        -- two-letter
  lat            double precision,
  lng            double precision,
  is_transfer    boolean not null default false,
  current_school text,
  -- metrics
  sixty_yd       numeric(4,2),  -- seconds
  exit_velo      int,           -- mph
  inf_velo       int,           -- mph
  of_velo        int,           -- mph
  fastball_velo  int,           -- mph
  pop_time       numeric(4,2),  -- seconds (catchers)
  highlight_url  text,
  bio            text,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- programs — college baseball programs
-- ---------------------------------------------------------------------------
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  division    public.division not null,
  city        text,
  state       text,
  lat         double precision,
  lng         double precision,
  conference  text,
  website     text,
  logo_url    text,
  about       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- program_staff — links coaches to programs
-- ---------------------------------------------------------------------------
create table if not exists public.program_staff (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.programs (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  staff_role  public.staff_role not null default 'assistant',
  created_at  timestamptz not null default now(),
  unique (program_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- needs — open roster needs posted by a program
-- ---------------------------------------------------------------------------
create table if not exists public.needs (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references public.programs (id) on delete cascade,
  title           text not null,
  positions       text[] not null default '{}',
  grad_year_min   int,
  grad_year_max   int,
  accepts_transfer boolean not null default false,
  min_gpa         numeric(3,2) not null default 0,
  must_have       text[] not null default '{}',
  -- metric bars (nullable thresholds the division expects)
  min_exit_velo   int,
  min_sixty       numeric(4,2),
  min_fastball_velo int,
  min_pop_time    numeric(4,2),
  description     text,
  status          public.need_status not null default 'open',
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists needs_program_idx on public.needs (program_id);
create index if not exists needs_status_idx on public.needs (status);

-- ---------------------------------------------------------------------------
-- applications — a player applies to a need
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id          uuid primary key default gen_random_uuid(),
  need_id     uuid not null references public.needs (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete cascade,
  status      public.application_status not null default 'new',
  fit_score   int,
  message     text,
  created_at  timestamptz not null default now(),
  viewed_at   timestamptz,
  unique (need_id, player_id)
);

create index if not exists applications_need_idx on public.applications (need_id);
create index if not exists applications_player_idx on public.applications (player_id);

-- ---------------------------------------------------------------------------
-- messages — conversation on an application (post-apply)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  sender_id      uuid not null references public.profiles (id) on delete cascade,
  body           text not null,
  created_at     timestamptz not null default now()
);

create index if not exists messages_application_idx on public.messages (application_id);

-- ---------------------------------------------------------------------------
-- notifications — in-app notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  data        jsonb not null default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at touch triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_players on public.players;
create trigger touch_players before update on public.players
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_needs on public.needs;
create trigger touch_needs before update on public.needs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- auto-create a profile when an auth user is created
-- (role + full_name come from sign-up metadata; onboarding fills the rest)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_role public.user_role;
begin
  begin
    meta_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'player');
  exception when others then
    meta_role := 'player';
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    meta_role
  )
  on conflict (id) do nothing;

  -- create the empty player row up front so onboarding can update it
  if meta_role = 'player' then
    insert into public.players (id) values (new.id) on conflict (id) do nothing;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
