-- Athletx — Phase 4.5: player posts (Updates + Highlights feeds) + media storage

-- ---------------------------------------------------------------------------
-- player_posts — a player's written updates and video/photo highlights
-- ---------------------------------------------------------------------------
create table if not exists public.player_posts (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players (id) on delete cascade,
  kind        text not null check (kind in ('update', 'highlight')),
  body        text,
  media_url   text,
  media_type  text check (media_type in ('image', 'video')),
  created_at  timestamptz not null default now()
);

create index if not exists player_posts_feed_idx
  on public.player_posts (player_id, kind, created_at desc);

alter table public.player_posts enable row level security;

-- Readable by the player themselves and by any coach allowed to see that
-- player (i.e. the player has applied to one of the coach's needs).
drop policy if exists player_posts_select on public.player_posts;
create policy player_posts_select on public.player_posts
  for select using (
    player_id = auth.uid() or public.coach_can_see_player(player_id)
  );

drop policy if exists player_posts_insert_own on public.player_posts;
create policy player_posts_insert_own on public.player_posts
  for insert with check (player_id = auth.uid());

drop policy if exists player_posts_update_own on public.player_posts;
create policy player_posts_update_own on public.player_posts
  for update using (player_id = auth.uid()) with check (player_id = auth.uid());

drop policy if exists player_posts_delete_own on public.player_posts;
create policy player_posts_delete_own on public.player_posts
  for delete using (player_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: a public-read bucket for player media (photos/videos).
-- Writes are restricted to each player's own folder: <uid>/<kind>/<file>.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('player-media', 'player-media', true)
on conflict (id) do nothing;

drop policy if exists "player media read" on storage.objects;
create policy "player media read" on storage.objects
  for select using (bucket_id = 'player-media');

drop policy if exists "player media insert own" on storage.objects;
create policy "player media insert own" on storage.objects
  for insert with check (
    bucket_id = 'player-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "player media update own" on storage.objects;
create policy "player media update own" on storage.objects
  for update using (
    bucket_id = 'player-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "player media delete own" on storage.objects;
create policy "player media delete own" on storage.objects
  for delete using (
    bucket_id = 'player-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
