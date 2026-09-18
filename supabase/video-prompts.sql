-- =============================================================================
-- Post-workout video prompt generator (owner-only). Stores each generated
-- prompt, its rating, and whether a response was recorded — this feeds back
-- into future generations. Private to the person who created it.
-- =============================================================================

create table if not exists public.video_prompts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  prompt      text not null,
  rating      text not null default 'unrated',  -- 'good' | 'bad' | 'unrated'
  recorded    boolean not null default false,
  difficulty  text not null default 'normal',   -- 'normal' | 'hard'
  created_at  timestamptz not null default now()
);

create index if not exists idx_video_prompts_owner
  on public.video_prompts (owner_id, created_at desc);

alter table public.video_prompts enable row level security;

-- Only you can see or manage your own prompts.
drop policy if exists video_prompts_all on public.video_prompts;
create policy video_prompts_all on public.video_prompts
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
