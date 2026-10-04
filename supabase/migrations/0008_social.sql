-- Athletx — Phase 5.6: follows, verified/recruiting fields, notifications

-- ---------------------------------------------------------------------------
-- Program extras
-- ---------------------------------------------------------------------------
alter table public.programs
  add column if not exists recruiting_pitch text,
  add column if not exists verified boolean not null default false;

-- ---------------------------------------------------------------------------
-- program_followers — a player saves/follows a school
-- ---------------------------------------------------------------------------
create table if not exists public.program_followers (
  player_id   uuid not null references public.players (id) on delete cascade,
  program_id  uuid not null references public.programs (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (player_id, program_id)
);

alter table public.program_followers enable row level security;

drop policy if exists program_followers_select on public.program_followers;
create policy program_followers_select on public.program_followers
  for select using (
    player_id = auth.uid() or public.coach_staffs_program(program_id)
  );

drop policy if exists program_followers_insert_own on public.program_followers;
create policy program_followers_insert_own on public.program_followers
  for insert with check (player_id = auth.uid());

drop policy if exists program_followers_delete_own on public.program_followers;
create policy program_followers_delete_own on public.program_followers
  for delete using (player_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Notifications: program update → followers + applicants
-- ---------------------------------------------------------------------------
create or replace function public.notify_program_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind <> 'update' then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  select distinct t.pl,
    'program_update',
    coalesce((select name from public.programs where id = new.program_id), 'A program')
      || ' posted an update',
    left(coalesce(new.body, 'New update'), 140),
    jsonb_build_object('program_id', new.program_id, 'post_id', new.id)
  from (
    select player_id as pl from public.program_followers where program_id = new.program_id
    union
    select a.player_id
    from public.applications a
    join public.needs n on n.id = a.need_id
    where n.program_id = new.program_id
  ) t;

  return new;
end $$;

drop trigger if exists on_program_update on public.program_posts;
create trigger on_program_update
  after insert on public.program_posts
  for each row execute function public.notify_program_update();

-- ---------------------------------------------------------------------------
-- Notifications: coach marks interest → notify the player
-- ---------------------------------------------------------------------------
create or replace function public.notify_interest()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'interested' and old.status is distinct from 'interested' then
    insert into public.notifications (user_id, type, title, body, data)
    select new.player_id,
      'coach_interested',
      coalesce(
        (select p.name from public.programs p
         join public.needs n on n.program_id = p.id
         where n.id = new.need_id),
        'A coach')
        || ' is interested',
      'A coach marked interest in you — keep an eye out.',
      jsonb_build_object('need_id', new.need_id, 'application_id', new.id);
  end if;
  return new;
end $$;

drop trigger if exists on_application_interest on public.applications;
create trigger on_application_interest
  after update on public.applications
  for each row execute function public.notify_interest();
