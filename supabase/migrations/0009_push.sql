-- Athletx — Phase 6: web push notifications

-- ---------------------------------------------------------------------------
-- push_subscriptions — one row per browser/device a user enabled push on
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_sub_select_own on public.push_subscriptions;
create policy push_sub_select_own on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists push_sub_insert_own on public.push_subscriptions;
create policy push_sub_insert_own on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists push_sub_update_own on public.push_subscriptions;
create policy push_sub_update_own on public.push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_sub_delete_own on public.push_subscriptions;
create policy push_sub_delete_own on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Notifications: new interest → notify the program's coaches
-- (a player tapping "I'm Interested" inserts an application)
-- ---------------------------------------------------------------------------
create or replace function public.notify_new_applicant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select ps.profile_id,
    'new_applicant',
    coalesce(
      (select pr.full_name from public.profiles pr where pr.id = new.player_id),
      'A player')
      || ' is interested',
    'For ' || coalesce(n.title, 'a roster spot') || '.',
    jsonb_build_object(
      'need_id', new.need_id,
      'application_id', new.id,
      'program_id', n.program_id
    )
  from public.needs n
  join public.program_staff ps on ps.program_id = n.program_id
  where n.id = new.need_id;

  return new;
end $$;

drop trigger if exists on_application_new on public.applications;
create trigger on_application_new
  after insert on public.applications
  for each row execute function public.notify_new_applicant();
