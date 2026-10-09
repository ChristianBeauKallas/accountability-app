-- 0027_feedback.sql
-- Lightweight in-app feedback so we can see where testers get stuck or
-- confused. Signed-in users submit; nobody reads it back through the API
-- (read it from the Supabase dashboard / service role).
--
-- Idempotent: safe to re-run.

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null default auth.uid(),
  path        text,          -- route the feedback came from
  context     text,          -- flow label, e.g. "onboarding"
  kind        text,          -- confusing | stuck | bug | idea | other
  message     text,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Signed-in users can submit; user_id defaults to their own id.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback'
      and policyname = 'feedback_insert'
  ) then
    create policy "feedback_insert"
      on public.feedback
      for insert
      to authenticated
      with check (true);
  end if;
end$$;

-- No SELECT/UPDATE/DELETE policy: reads happen from the dashboard.
