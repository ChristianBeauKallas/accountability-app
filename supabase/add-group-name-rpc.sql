-- Adds group_name_by_code(code) so the invite/join screen can greet visitors
-- with the group's name before they've signed in. Safe: it returns only the
-- name to anyone holding the invite code (which they need to join anyway).
--
-- Run this once against your Supabase database (SQL editor or psql).

create or replace function public.group_name_by_code(code text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select name from public.groups where invite_code = code;
$$;

grant execute on function public.group_name_by_code(text) to anon, authenticated;
