-- =============================================================================
-- 1:1 Coaching — coach-defined trackers + the client's editable, timestamped
-- daily log. Private to the coach and client. Run once against your database.
--
-- Model: the coach defines TRACKERS (what to log). The client logs ENTRIES
-- against them throughout the day. Every entry stores BOTH happened_at (the
-- time of the event, editable/backdatable) and logged_at (when it was actually
-- entered) so the coach can tell real-time logging from end-of-day batching.
-- coaching_relationships + checkins already exist from the base schema; the
-- entry log below supersedes the single-row checkin for day-to-day tracking.
-- =============================================================================

-- ---- trackers: the coach defines what to track ------------------------------
create table if not exists public.coaching_trackers (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  label           text not null,
  emoji           text,
  prompt          text,   -- context question for the note field ("What did you eat?")
  sort_order      int not null default 0,
  repeatable      boolean not null default false, -- many/day (meal, water) vs once/day (wake, sleep)
  wants_photo     boolean not null default false,
  wants_note      boolean not null default true,
  wants_amount    boolean not null default false,
  unit            text,                            -- e.g. 'oz', 'lb', 'min'
  target          numeric,                         -- optional daily goal
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---- entries: the client logs against a tracker -----------------------------
create table if not exists public.coaching_entries (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  client_id       uuid not null references public.profiles (id) on delete cascade,
  tracker_id      uuid not null references public.coaching_trackers (id) on delete cascade,
  happened_at     timestamptz not null default now(), -- editable / backdatable
  detail          text,
  amount          numeric,
  logged_at       timestamptz not null default now(), -- when it was actually entered
  created_at      timestamptz not null default now()
);

-- ---- coach feedback, one note per day ---------------------------------------
create table if not exists public.coaching_feedback (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  coach_id        uuid not null references public.profiles (id) on delete cascade,
  day             date not null,
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (relationship_id, day)
);

-- ---- coach-scheduled reminders (nudges) -------------------------------------
create table if not exists public.coaching_reminders (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  tracker_id      uuid references public.coaching_trackers (id) on delete cascade,
  label           text not null,
  at_minute       int not null,  -- minutes since local midnight (6:30am = 390)
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---- context prompts on trackers (safe to re-run) ---------------------------
alter table public.coaching_trackers add column if not exists prompt text;
update public.coaching_trackers set prompt = case label
    when 'Meal'     then 'What did you eat?'
    when 'Water'    then 'What did you drink?'
    when 'Exercise' then 'What did you do?'
    when 'Read'     then 'What did you read?'
    when 'Podcast'  then 'What did you listen to?'
    else prompt
  end
  where prompt is null;

-- ---- media can attach to an entry too ---------------------------------------
alter table public.media add column if not exists entry_id uuid
  references public.coaching_entries (id) on delete cascade;
alter table public.media drop constraint if exists media_one_parent;
alter table public.media add constraint media_one_parent check (
  (post_id is not null)::int + (checkin_id is not null)::int
    + (entry_id is not null)::int = 1
);

-- ---- indexes ----------------------------------------------------------------
create index if not exists idx_coaching_trackers_rel
  on public.coaching_trackers (relationship_id, sort_order);
create index if not exists idx_coaching_entries_rel_time
  on public.coaching_entries (relationship_id, happened_at desc);
create index if not exists idx_coaching_entries_client_time
  on public.coaching_entries (client_id, happened_at desc);
create index if not exists idx_media_entry on public.media (entry_id);

-- ---- helper predicates (SECURITY DEFINER to avoid RLS recursion) ------------
create or replace function public.in_relationship(rel uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coaching_relationships r
    where r.id = rel and (r.coach_id = auth.uid() or r.client_id = auth.uid())
  );
$$;
create or replace function public.is_coach_of_rel(rel uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coaching_relationships r
    where r.id = rel and r.coach_id = auth.uid()
  );
$$;
create or replace function public.is_client_of_rel(rel uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coaching_relationships r
    where r.id = rel and r.client_id = auth.uid()
  );
$$;
grant execute on function public.in_relationship(uuid) to authenticated;
grant execute on function public.is_coach_of_rel(uuid) to authenticated;
grant execute on function public.is_client_of_rel(uuid) to authenticated;

-- ---- RLS --------------------------------------------------------------------
alter table public.coaching_trackers  enable row level security;
alter table public.coaching_entries   enable row level security;
alter table public.coaching_feedback  enable row level security;
alter table public.coaching_reminders enable row level security;

drop policy if exists coaching_trackers_select on public.coaching_trackers;
create policy coaching_trackers_select on public.coaching_trackers
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists coaching_trackers_write on public.coaching_trackers;
create policy coaching_trackers_write on public.coaching_trackers
  for all to authenticated
  using (public.is_coach_of_rel(relationship_id))
  with check (public.is_coach_of_rel(relationship_id));

drop policy if exists coaching_entries_select on public.coaching_entries;
create policy coaching_entries_select on public.coaching_entries
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists coaching_entries_write on public.coaching_entries;
create policy coaching_entries_write on public.coaching_entries
  for all to authenticated
  using (client_id = auth.uid() and public.is_client_of_rel(relationship_id))
  with check (client_id = auth.uid() and public.is_client_of_rel(relationship_id));

drop policy if exists coaching_feedback_select on public.coaching_feedback;
create policy coaching_feedback_select on public.coaching_feedback
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists coaching_feedback_write on public.coaching_feedback;
create policy coaching_feedback_write on public.coaching_feedback
  for all to authenticated
  using (public.is_coach_of_rel(relationship_id))
  with check (public.is_coach_of_rel(relationship_id) and coach_id = auth.uid());

drop policy if exists coaching_reminders_select on public.coaching_reminders;
create policy coaching_reminders_select on public.coaching_reminders
  for select to authenticated using (public.in_relationship(relationship_id));
drop policy if exists coaching_reminders_write on public.coaching_reminders;
create policy coaching_reminders_write on public.coaching_reminders
  for all to authenticated
  using (public.is_coach_of_rel(relationship_id))
  with check (public.is_coach_of_rel(relationship_id));

-- media SELECT: add the entry branch (coach or client of the entry).
drop policy if exists media_select on public.media;
create policy media_select on public.media
  for select to authenticated using (
    (post_id is not null and exists (
      select 1 from public.group_posts p
      where p.id = post_id and public.is_group_member(p.group_id)
    ))
    or (checkin_id is not null and exists (
      select 1 from public.checkins c
      join public.coaching_relationships r on r.id = c.relationship_id
      where c.id = checkin_id
        and (r.coach_id = auth.uid() or r.client_id = auth.uid())
    ))
    or (entry_id is not null and exists (
      select 1 from public.coaching_entries e
      join public.coaching_relationships r on r.id = e.relationship_id
      where e.id = entry_id
        and (r.coach_id = auth.uid() or r.client_id = auth.uid())
    ))
  );

-- Storage read: let the coach (and client) read the client's entry photos.
drop policy if exists media_group_read on storage.objects;
create policy media_group_read on storage.objects
  for select to authenticated using (
    bucket_id = 'media' and (
      exists (
        select 1 from public.media m
        join public.group_posts p on p.id = m.post_id
        where m.storage_path = name and public.is_group_member(p.group_id)
      )
      or exists (
        select 1 from public.media m
        join public.checkins c on c.id = m.checkin_id
        join public.coaching_relationships r on r.id = c.relationship_id
        where m.storage_path = name
          and (r.coach_id = auth.uid() or r.client_id = auth.uid())
      )
      or exists (
        select 1 from public.media m
        join public.coaching_entries e on e.id = m.entry_id
        join public.coaching_relationships r on r.id = e.relationship_id
        where m.storage_path = name
          and (r.coach_id = auth.uid() or r.client_id = auth.uid())
      )
    )
  );

-- ---- start_coaching: create the relationship + seed default trackers --------
create or replace function public.start_coaching(client uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  rel_id uuid;
begin
  insert into public.coaching_relationships (coach_id, client_id)
  values (auth.uid(), client)
  on conflict (coach_id, client_id) do update set coach_id = excluded.coach_id
  returning id into rel_id;

  if not exists (
    select 1 from public.coaching_trackers where relationship_id = rel_id
  ) then
    insert into public.coaching_trackers
      (relationship_id, label, emoji, prompt, sort_order, repeatable, wants_photo, wants_note, wants_amount, unit, target)
    values
      (rel_id, 'Wake up',         '☀️', null,                    10, false, false, false, false, null, null),
      (rel_id, 'Meal',            '🍽️', 'What did you eat?',      20, true,  true,  true,  false, null, null),
      (rel_id, 'Water',           '💧', 'What did you drink?',    30, true,  false, true,  true,  'oz', 100),
      (rel_id, 'Exercise',        '🏋️', 'What did you do?',       40, true,  false, true,  false, null, null),
      (rel_id, 'Read',            '📖', 'What did you read?',     50, true,  false, true,  false, null, null),
      (rel_id, 'Podcast',         '🎧', 'What did you listen to?',60, true,  false, true,  false, null, null),
      (rel_id, 'Sleep',           '🌙', null,                    70, false, false, false, false, null, null),
      (rel_id, 'Progress selfie', '📸', null,                    80, false, true,  false, false, null, null),
      (rel_id, 'Weight',          '⚖️', null,                    90, false, false, false, true,  'lb', null);
  end if;

  return rel_id;
end;
$$;
grant execute on function public.start_coaching(uuid) to authenticated;
