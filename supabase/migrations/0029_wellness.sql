-- 0029_wellness.sql
-- Wellness Incentive Program schema. Additive and self-contained: everything is
-- prefixed wl_ so it lives alongside the (now archived) recruiting tables in the
-- same Supabase project without touching them.
--
-- A "program" is one company/agency's wellness group. An admin creates it and
-- sets the rules (days per month, minutes per day, wellness hours banked, and
-- the monthly bonus). Members join by invite link, log daily movement
-- (wl_checkins), and a day "qualifies" when its total minutes >= mins_per_day.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.wl_programs (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  days_goal             int  not null default 12,
  mins_per_day          int  not null default 30,
  bank_hours_per_month  numeric not null default 4,
  monthly_bonus_cents   int  not null default 5000,
  invite_code           text not null unique,
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now()
);

create table if not exists public.wl_members (
  id          uuid primary key references auth.users (id) on delete cascade,
  program_id  uuid not null references public.wl_programs (id) on delete cascade,
  name        text not null,
  avatar_url  text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists wl_members_program_idx on public.wl_members (program_id);

create table if not exists public.wl_checkins (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.wl_members (id) on delete cascade,
  program_id       uuid not null references public.wl_programs (id) on delete cascade,
  photo_url        text,
  lat              double precision,
  lng              double precision,
  place            text,
  description      text,
  duration_minutes int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists wl_checkins_program_created_idx
  on public.wl_checkins (program_id, created_at desc);
create index if not exists wl_checkins_member_created_idx
  on public.wl_checkins (member_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------
create or replace function public.wl_my_program()
returns uuid
language sql stable security definer set search_path = public as $$
  select program_id from public.wl_members where id = auth.uid();
$$;

create or replace function public.wl_is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.wl_members where id = auth.uid()), false);
$$;

-- Public lookup so the /join/<code> page can show the program name before the
-- visitor has an account. Returns only id + name, never the rules or members.
create or replace function public.wl_program_by_code(p_code text)
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select id, name from public.wl_programs where invite_code = p_code;
$$;
grant execute on function public.wl_program_by_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.wl_programs  enable row level security;
alter table public.wl_members   enable row level security;
alter table public.wl_checkins  enable row level security;

do $$
begin
  -- wl_programs -----------------------------------------------------------
  if not exists (select 1 from pg_policies where tablename='wl_programs' and policyname='wl_programs_select') then
    create policy "wl_programs_select" on public.wl_programs
      for select to authenticated
      using (id = public.wl_my_program());
  end if;

  if not exists (select 1 from pg_policies where tablename='wl_programs' and policyname='wl_programs_insert') then
    create policy "wl_programs_insert" on public.wl_programs
      for insert to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='wl_programs' and policyname='wl_programs_update') then
    create policy "wl_programs_update" on public.wl_programs
      for update to authenticated
      using (id = public.wl_my_program() and public.wl_is_admin())
      with check (id = public.wl_my_program() and public.wl_is_admin());
  end if;

  -- wl_members ------------------------------------------------------------
  if not exists (select 1 from pg_policies where tablename='wl_members' and policyname='wl_members_select') then
    create policy "wl_members_select" on public.wl_members
      for select to authenticated
      using (program_id = public.wl_my_program());
  end if;

  if not exists (select 1 from pg_policies where tablename='wl_members' and policyname='wl_members_insert') then
    create policy "wl_members_insert" on public.wl_members
      for insert to authenticated
      with check (id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='wl_members' and policyname='wl_members_update') then
    create policy "wl_members_update" on public.wl_members
      for update to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  -- wl_checkins -----------------------------------------------------------
  if not exists (select 1 from pg_policies where tablename='wl_checkins' and policyname='wl_checkins_select') then
    create policy "wl_checkins_select" on public.wl_checkins
      for select to authenticated
      using (program_id = public.wl_my_program());
  end if;

  if not exists (select 1 from pg_policies where tablename='wl_checkins' and policyname='wl_checkins_insert') then
    create policy "wl_checkins_insert" on public.wl_checkins
      for insert to authenticated
      with check (member_id = auth.uid() and program_id = public.wl_my_program());
  end if;

  if not exists (select 1 from pg_policies where tablename='wl_checkins' and policyname='wl_checkins_modify') then
    create policy "wl_checkins_modify" on public.wl_checkins
      for update to authenticated
      using (member_id = auth.uid()) with check (member_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='wl_checkins' and policyname='wl_checkins_delete') then
    create policy "wl_checkins_delete" on public.wl_checkins
      for delete to authenticated
      using (member_id = auth.uid());
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- Storage: a public bucket for check-in photos and avatars.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('wellness', 'wellness', true)
  on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='wl_storage_read') then
    create policy "wl_storage_read" on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'wellness');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='wl_storage_write') then
    create policy "wl_storage_write" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'wellness');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='wl_storage_update') then
    create policy "wl_storage_update" on storage.objects
      for update to authenticated
      using (bucket_id = 'wellness');
  end if;
end$$;
