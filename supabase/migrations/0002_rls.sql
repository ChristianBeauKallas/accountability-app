-- Athletx — Phase 2 Row Level Security
--
-- Core anti-spam promise: NOBODY browses players directly. A coach can only
-- read a player's profile/row once that player has applied to one of the
-- coach's program needs. Players can read open needs + program pages + their
-- own applications, and nothing about other players.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------------

-- Does the current user staff this program?
create or replace function public.coach_staffs_program(p_program uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.program_staff ps
    where ps.program_id = p_program and ps.profile_id = auth.uid()
  );
$$;

-- Does the current user staff the program that owns this need?
create or replace function public.coach_can_see_need(p_need uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.needs n
    join public.program_staff ps on ps.program_id = n.program_id
    where n.id = p_need and ps.profile_id = auth.uid()
  );
$$;

-- Has this player applied to a need belonging to a program the current user staffs?
create or replace function public.coach_can_see_player(p_player uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.applications a
    join public.needs n on n.id = a.need_id
    join public.program_staff ps on ps.program_id = n.program_id
    where a.player_id = p_player and ps.profile_id = auth.uid()
  );
$$;

-- Is the current user a participant on this application (owning player or a
-- coach staffing the need's program)?
create or replace function public.can_see_application(p_app uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.applications a
    where a.id = p_app
      and (
        a.player_id = auth.uid()
        or exists (
          select 1 from public.needs n
          join public.program_staff ps on ps.program_id = n.program_id
          where n.id = a.need_id and ps.profile_id = auth.uid()
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.players        enable row level security;
alter table public.programs       enable row level security;
alter table public.program_staff  enable row level security;
alter table public.needs          enable row level security;
alter table public.applications   enable row level security;
alter table public.messages       enable row level security;
alter table public.notifications  enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

-- coach profiles are readable by any authenticated user (shown on program pages)
drop policy if exists profiles_select_coaches on public.profiles;
create policy profiles_select_coaches on public.profiles
  for select using (role = 'coach' and auth.uid() is not null);

-- a coach can read the profile of a player who applied to their need
drop policy if exists profiles_select_applicants on public.profiles;
create policy profiles_select_applicants on public.profiles
  for select using (role = 'player' and public.coach_can_see_player(id));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- players  (NO general browse — this is the anti-spam core)
-- ---------------------------------------------------------------------------
drop policy if exists players_select_own on public.players;
create policy players_select_own on public.players
  for select using (id = auth.uid());

drop policy if exists players_select_applicants on public.players;
create policy players_select_applicants on public.players
  for select using (public.coach_can_see_player(id));

drop policy if exists players_insert_own on public.players;
create policy players_insert_own on public.players
  for insert with check (id = auth.uid());

drop policy if exists players_update_own on public.players;
create policy players_update_own on public.players
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- programs (public pages for any authenticated user)
-- ---------------------------------------------------------------------------
drop policy if exists programs_select_all on public.programs;
create policy programs_select_all on public.programs
  for select using (auth.uid() is not null);

-- any authenticated coach may create a program (then adds themselves as staff)
drop policy if exists programs_insert_coach on public.programs;
create policy programs_insert_coach on public.programs
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
  );

drop policy if exists programs_update_staff on public.programs;
create policy programs_update_staff on public.programs
  for update using (public.coach_staffs_program(id)) with check (public.coach_staffs_program(id));

-- ---------------------------------------------------------------------------
-- program_staff
-- ---------------------------------------------------------------------------
drop policy if exists program_staff_select on public.program_staff;
create policy program_staff_select on public.program_staff
  for select using (auth.uid() is not null);

-- a coach may add themselves to a program
drop policy if exists program_staff_insert_self on public.program_staff;
create policy program_staff_insert_self on public.program_staff
  for insert with check (
    profile_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
  );

drop policy if exists program_staff_delete_self on public.program_staff;
create policy program_staff_delete_self on public.program_staff
  for delete using (profile_id = auth.uid() or public.coach_staffs_program(program_id));

-- ---------------------------------------------------------------------------
-- needs
-- ---------------------------------------------------------------------------
-- players (and everyone) may read OPEN needs; staff read all their needs
drop policy if exists needs_select_open on public.needs;
create policy needs_select_open on public.needs
  for select using (
    (status = 'open' and auth.uid() is not null)
    or public.coach_staffs_program(program_id)
  );

drop policy if exists needs_insert_staff on public.needs;
create policy needs_insert_staff on public.needs
  for insert with check (public.coach_staffs_program(program_id));

drop policy if exists needs_update_staff on public.needs;
create policy needs_update_staff on public.needs
  for update using (public.coach_staffs_program(program_id))
  with check (public.coach_staffs_program(program_id));

drop policy if exists needs_delete_staff on public.needs;
create policy needs_delete_staff on public.needs
  for delete using (public.coach_staffs_program(program_id));

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
-- player reads own; coach reads applications to their program's needs
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select using (
    player_id = auth.uid() or public.coach_can_see_need(need_id)
  );

-- a player applies for themselves, and only to an OPEN need
drop policy if exists applications_insert_player on public.applications;
create policy applications_insert_player on public.applications
  for insert with check (
    player_id = auth.uid()
    and exists (select 1 from public.needs n where n.id = need_id and n.status = 'open')
  );

-- player may update own (e.g. withdraw); coach may update apps to their needs
drop policy if exists applications_update_player on public.applications;
create policy applications_update_player on public.applications
  for update using (player_id = auth.uid()) with check (player_id = auth.uid());

drop policy if exists applications_update_coach on public.applications;
create policy applications_update_coach on public.applications
  for update using (public.coach_can_see_need(need_id))
  with check (public.coach_can_see_need(need_id));

-- ---------------------------------------------------------------------------
-- messages (only application participants)
-- ---------------------------------------------------------------------------
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (public.can_see_application(application_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid() and public.can_see_application(application_id)
  );

-- ---------------------------------------------------------------------------
-- notifications (own only; inserts happen via service role / definer fns)
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
