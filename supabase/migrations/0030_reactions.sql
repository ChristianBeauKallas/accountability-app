-- 0030_reactions.sql
-- Emoji reactions on check-ins (fire / thumbs up / heart). One row per
-- (check-in, member, emoji), so a member can add one of each kind and toggle
-- it off. Visible to everyone in the program.
--
-- Idempotent: safe to re-run.

create table if not exists public.wl_reactions (
  checkin_id uuid not null references public.wl_checkins (id) on delete cascade,
  member_id  uuid not null references public.wl_members (id) on delete cascade,
  emoji      text not null check (emoji in ('fire', 'thumb', 'heart')),
  created_at timestamptz not null default now(),
  primary key (checkin_id, member_id, emoji)
);
create index if not exists wl_reactions_checkin_idx on public.wl_reactions (checkin_id);

alter table public.wl_reactions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='wl_reactions' and policyname='wl_reactions_select') then
    create policy "wl_reactions_select" on public.wl_reactions
      for select to authenticated
      using (exists (select 1 from public.wl_checkins c where c.id = checkin_id and c.program_id = public.wl_my_program()));
  end if;

  if not exists (select 1 from pg_policies where tablename='wl_reactions' and policyname='wl_reactions_insert') then
    create policy "wl_reactions_insert" on public.wl_reactions
      for insert to authenticated
      with check (
        member_id = auth.uid()
        and exists (select 1 from public.wl_checkins c where c.id = checkin_id and c.program_id = public.wl_my_program())
      );
  end if;

  if not exists (select 1 from pg_policies where tablename='wl_reactions' and policyname='wl_reactions_delete') then
    create policy "wl_reactions_delete" on public.wl_reactions
      for delete to authenticated
      using (member_id = auth.uid());
  end if;
end$$;
