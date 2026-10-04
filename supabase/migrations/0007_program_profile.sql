-- Athletx — Phase 5.5: richer program profile + program posts (Updates/Facilities)

-- Extra program-profile fields shown on the school page.
alter table public.programs
  add column if not exists record_last_season text,
  add column if not exists enrollment int,
  add column if not exists min_gpa numeric(3,2);

-- ---------------------------------------------------------------------------
-- program_posts — a program's updates + facility photos/videos
-- ---------------------------------------------------------------------------
create table if not exists public.program_posts (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.programs (id) on delete cascade,
  kind        text not null check (kind in ('update', 'facility')),
  body        text,
  media_url   text,
  media_type  text check (media_type in ('image', 'video')),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists program_posts_feed_idx
  on public.program_posts (program_id, kind, created_at desc);

alter table public.program_posts enable row level security;

-- Any signed-in user can read a program's posts (school pages are public).
drop policy if exists program_posts_select on public.program_posts;
create policy program_posts_select on public.program_posts
  for select using (auth.uid() is not null);

-- Only staff of the program can post / edit / delete.
drop policy if exists program_posts_insert_staff on public.program_posts;
create policy program_posts_insert_staff on public.program_posts
  for insert with check (public.coach_staffs_program(program_id));

drop policy if exists program_posts_update_staff on public.program_posts;
create policy program_posts_update_staff on public.program_posts
  for update using (public.coach_staffs_program(program_id))
  with check (public.coach_staffs_program(program_id));

drop policy if exists program_posts_delete_staff on public.program_posts;
create policy program_posts_delete_staff on public.program_posts
  for delete using (public.coach_staffs_program(program_id));

-- Program media reuses the public-read `player-media` bucket; writes stay
-- in the uploader's own <uid>/… folder, which the existing bucket policy allows.
