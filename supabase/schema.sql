-- =============================================================================
-- Accountability App — database schema (v1 foundation)
-- =============================================================================
-- Run this in the Supabase Dashboard -> SQL Editor. It is idempotent-ish:
-- tables use "if not exists" and policies are dropped-then-created, so you can
-- re-run it while iterating. It replaces the old demo `goals` table.
--
-- Design notes:
--   * Everything is scoped to a GROUP so multi-group is a UI unlock later,
--     not a rebuild.
--   * A group post and a coaching check-in are SEPARATE tables driving SEPARATE
--     streaks (showing up for coaching does not keep your group streak alive).
--   * Media (photo/voice, video later) is handled once and can attach to either
--     a post or a check-in.
--   * Membership checks go through SECURITY DEFINER helper functions so RLS
--     policies don't recurse (a group_members policy that queries group_members
--     would otherwise loop forever).
-- =============================================================================

-- Clean up the old starter demo table if it's still around.
drop table if exists public.goals cascade;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.member_role as enum ('owner', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_type as enum ('image', 'audio', 'video');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Tables
-- =============================================================================

-- Profiles — one row per auth user. Timezone matters: streaks are counted per
-- calendar day in the user's own timezone.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'New member',
  avatar_url   text,
  timezone     text not null default 'America/New_York',
  created_at   timestamptz not null default now()
);

-- Groups — each has an owner and an invite code for joining.
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz not null default now()
);

-- Group membership.
create table if not exists public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Activities — the group's tasks (e.g. the "5 things"). Group-owned; members
-- toggle these on their daily post. (Member editing/voting is a later feature.)
create table if not exists public.activities (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  name       text not null,
  emoji      text,
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Group posts — the daily update. Activity toggles are the heart of it;
-- caption/media are optional context.
create table if not exists public.group_posts (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  caption    text,
  created_at timestamptz not null default now()
);

-- Which activities a post reported as done.
create table if not exists public.post_activities (
  post_id     uuid not null references public.group_posts (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  primary key (post_id, activity_id)
);

-- Comments on posts.
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.group_posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- Coaching relationship — one coach, one client.
create table if not exists public.coaching_relationships (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  client_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, client_id)
);

-- Coaching check-in — structured, private to client + coach. Drives the
-- coaching streak, independent of the group streak.
create table if not exists public.checkins (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  client_id       uuid not null references public.profiles (id) on delete cascade,
  weight          numeric(5, 1),
  sleep_hours     numeric(3, 1),
  energy          int check (energy between 1 and 5),
  moved           boolean,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Media — handled once, attaches to a post OR a check-in. Video is modeled now
-- but not surfaced in the v1 UI.
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  type         public.media_type not null,
  storage_path text not null,
  post_id      uuid references public.group_posts (id) on delete cascade,
  checkin_id   uuid references public.checkins (id) on delete cascade,
  created_at   timestamptz not null default now(),
  -- A media row belongs to exactly one parent.
  constraint media_one_parent check (
    (post_id is not null)::int + (checkin_id is not null)::int = 1
  )
);

-- Helpful indexes for the feed / board queries.
create index if not exists idx_group_posts_group_created
  on public.group_posts (group_id, created_at desc);
create index if not exists idx_comments_post
  on public.comments (post_id, created_at);
create index if not exists idx_checkins_client_created
  on public.checkins (client_id, created_at desc);
create index if not exists idx_group_members_user
  on public.group_members (user_id);

-- =============================================================================
-- Helper functions (SECURITY DEFINER so RLS policies don't recurse)
-- =============================================================================

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- =============================================================================
-- Auto-create a profile row when a new auth user signs up.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- RPCs the app calls (create/join a group atomically).
-- =============================================================================

-- Create a group, make the caller its owner, and add them as a member.
create or replace function public.create_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
begin
  insert into public.groups (name, owner_id)
  values (group_name, auth.uid())
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, auth.uid(), 'owner');

  return new_group_id;
end;
$$;

-- Join a group by its invite code.
create or replace function public.join_group(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
begin
  select id into target_group_id from public.groups where invite_code = code;
  if target_group_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (target_group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return target_group_id;
end;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.profiles              enable row level security;
alter table public.groups                enable row level security;
alter table public.group_members         enable row level security;
alter table public.activities            enable row level security;
alter table public.group_posts           enable row level security;
alter table public.post_activities       enable row level security;
alter table public.comments              enable row level security;
alter table public.coaching_relationships enable row level security;
alter table public.checkins              enable row level security;
alter table public.media                 enable row level security;

-- ---- profiles ---------------------------------------------------------------
-- Display name + avatar are not sensitive; any signed-in user can read them so
-- members and coaches can see each other. You can only edit your own.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---- groups -----------------------------------------------------------------
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select to authenticated using (public.is_group_member(id));

drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update to authenticated using (public.is_group_owner(id));

-- ---- group_members ----------------------------------------------------------
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated using (public.is_group_member(group_id));

-- Inserts go through create_group / join_group (SECURITY DEFINER), so no
-- direct insert policy is needed. Members can remove themselves.
drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete to authenticated using (user_id = auth.uid());

-- ---- activities -------------------------------------------------------------
drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists activities_write on public.activities;
create policy activities_write on public.activities
  for all to authenticated
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));

-- ---- group_posts ------------------------------------------------------------
drop policy if exists group_posts_select on public.group_posts;
create policy group_posts_select on public.group_posts
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists group_posts_insert on public.group_posts;
create policy group_posts_insert on public.group_posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists group_posts_modify on public.group_posts;
create policy group_posts_modify on public.group_posts
  for update to authenticated using (author_id = auth.uid());

drop policy if exists group_posts_delete on public.group_posts;
create policy group_posts_delete on public.group_posts
  for delete to authenticated using (author_id = auth.uid());

-- ---- post_activities --------------------------------------------------------
drop policy if exists post_activities_select on public.post_activities;
create policy post_activities_select on public.post_activities
  for select to authenticated using (
    exists (
      select 1 from public.group_posts p
      where p.id = post_id and public.is_group_member(p.group_id)
    )
  );

drop policy if exists post_activities_write on public.post_activities;
create policy post_activities_write on public.post_activities
  for all to authenticated using (
    exists (
      select 1 from public.group_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.group_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- ---- comments ---------------------------------------------------------------
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated using (
    exists (
      select 1 from public.group_posts p
      where p.id = post_id and public.is_group_member(p.group_id)
    )
  );

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to authenticated with check (
    author_id = auth.uid() and exists (
      select 1 from public.group_posts p
      where p.id = post_id and public.is_group_member(p.group_id)
    )
  );

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated using (author_id = auth.uid());

-- ---- coaching_relationships -------------------------------------------------
drop policy if exists coaching_select on public.coaching_relationships;
create policy coaching_select on public.coaching_relationships
  for select to authenticated
  using (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists coaching_insert on public.coaching_relationships;
create policy coaching_insert on public.coaching_relationships
  for insert to authenticated with check (coach_id = auth.uid());

-- ---- checkins ---------------------------------------------------------------
drop policy if exists checkins_select on public.checkins;
create policy checkins_select on public.checkins
  for select to authenticated using (
    exists (
      select 1 from public.coaching_relationships r
      where r.id = relationship_id
        and (r.coach_id = auth.uid() or r.client_id = auth.uid())
    )
  );

drop policy if exists checkins_insert on public.checkins;
create policy checkins_insert on public.checkins
  for insert to authenticated with check (
    client_id = auth.uid() and exists (
      select 1 from public.coaching_relationships r
      where r.id = relationship_id and r.client_id = auth.uid()
    )
  );

-- ---- media ------------------------------------------------------------------
drop policy if exists media_select on public.media;
create policy media_select on public.media
  for select to authenticated using (
    (post_id is not null and exists (
      select 1 from public.group_posts p
      where p.id = post_id and public.is_group_member(p.group_id)
    ))
    or
    (checkin_id is not null and exists (
      select 1 from public.checkins c
      join public.coaching_relationships r on r.id = c.relationship_id
      where c.id = checkin_id
        and (r.coach_id = auth.uid() or r.client_id = auth.uid())
    ))
  );

drop policy if exists media_insert on public.media;
create policy media_insert on public.media
  for insert to authenticated with check (owner_id = auth.uid());

-- =============================================================================
-- Storage bucket for photos / voice notes (private; served via signed URLs).
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- Any signed-in user can upload into a folder named after their own user id
-- (path convention: media/<user_id>/<file>). Read access is granted through
-- signed URLs the app generates, so no broad storage read policy is needed.
drop policy if exists media_upload on storage.objects;
create policy media_upload on storage.objects
  for insert to authenticated with check (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists media_owner_read on storage.objects;
create policy media_owner_read on storage.objects
  for select to authenticated using (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public bucket for profile pictures (avatars show all over the app, so a
-- public URL avoids signing them everywhere). Files still land in a per-user
-- folder that only the owner can write to.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone who can see the parent post/check-in can read its media object. This
-- lets group members view each other's photos/voice notes via signed URLs
-- while keeping the bucket private.
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
    )
  );

-- =============================================================================
-- Chat — casual group conversation, separate from the accountability feed.
-- =============================================================================
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_group_created
  on public.messages (group_id, created_at);

alter table public.messages enable row level security;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete to authenticated using (author_id = auth.uid());

-- Enable Realtime so new messages appear instantly. Ignore if already added.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;

-- =============================================================================
-- Push notifications — one row per device/browser subscription.
-- =============================================================================
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  endpoint     text not null unique,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subs_select on public.push_subscriptions;
create policy push_subs_select on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists push_subs_insert on public.push_subscriptions;
create policy push_subs_insert on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists push_subs_update on public.push_subscriptions;
create policy push_subs_update on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid());

drop policy if exists push_subs_delete on public.push_subscriptions;
create policy push_subs_delete on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- =============================================================================
-- Fire reactions on posts (like a "like", but 🔥). One per user per post.
-- =============================================================================
create table if not exists public.post_reactions (
  post_id    uuid not null references public.group_posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_reactions enable row level security;

drop policy if exists post_reactions_select on public.post_reactions;
create policy post_reactions_select on public.post_reactions
  for select to authenticated using (
    exists (
      select 1 from public.group_posts p
      where p.id = post_id and public.is_group_member(p.group_id)
    )
  );

drop policy if exists post_reactions_insert on public.post_reactions;
create policy post_reactions_insert on public.post_reactions
  for insert to authenticated with check (
    user_id = auth.uid() and exists (
      select 1 from public.group_posts p
      where p.id = post_id and public.is_group_member(p.group_id)
    )
  );

drop policy if exists post_reactions_delete on public.post_reactions;
create policy post_reactions_delete on public.post_reactions
  for delete to authenticated using (user_id = auth.uid());
