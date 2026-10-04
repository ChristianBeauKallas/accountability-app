-- Athletx — Phase 6.5: contact exchange on a mutual match
--
-- Contact details live in their own table (NOT on profiles, which a coach can
-- read as soon as a player applies). A row here is visible to the other party
-- ONLY once there is mutual interest — i.e. the player applied AND a coach on
-- that program marked the application 'interested'.

create table if not exists public.contact_info (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  email       text,
  phone       text,
  updated_at  timestamptz not null default now()
);

alter table public.contact_info enable row level security;

-- ---------------------------------------------------------------------------
-- Mutual-interest helpers (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------------

-- Current coach has a mutual match with this player?
create or replace function public.coach_mutual_with_player(p_player uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.applications a
    join public.needs n on n.id = a.need_id
    join public.program_staff ps on ps.program_id = n.program_id
    where a.player_id = p_player
      and a.status = 'interested'
      and ps.profile_id = auth.uid()
  );
$$;

-- Current player has a mutual match with a program this coach staffs?
create or replace function public.player_mutual_with_coach(p_coach uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.applications a
    join public.needs n on n.id = a.need_id
    join public.program_staff ps on ps.program_id = n.program_id
    where a.player_id = auth.uid()
      and a.status = 'interested'
      and ps.profile_id = p_coach
  );
$$;

-- ---------------------------------------------------------------------------
-- Policies: manage your own; read the other party's only on a mutual match
-- ---------------------------------------------------------------------------
drop policy if exists contact_select on public.contact_info;
create policy contact_select on public.contact_info
  for select using (
    user_id = auth.uid()
    or public.coach_mutual_with_player(user_id)
    or public.player_mutual_with_coach(user_id)
  );

drop policy if exists contact_insert_own on public.contact_info;
create policy contact_insert_own on public.contact_info
  for insert with check (user_id = auth.uid());

drop policy if exists contact_update_own on public.contact_info;
create policy contact_update_own on public.contact_info
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
