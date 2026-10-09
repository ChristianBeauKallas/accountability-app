-- 0028_waitlist_count.sql
-- Exposes ONLY the number of signups per side, so the public page can switch
-- its copy ("founding test group" vs "next wave") once 10 have joined —
-- without a read policy that would expose anyone's contact info.
--
-- Idempotent: safe to re-run.

create or replace function public.waitlist_count(p_kind text)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from public.waitlist where kind = p_kind;
$$;

grant execute on function public.waitlist_count(text) to anon, authenticated;
