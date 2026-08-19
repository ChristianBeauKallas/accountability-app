-- =============================================================================
-- Let the group OWNER remove members from their group (not themselves / other
-- owners). Members can still remove themselves. Depends on schema.sql.
-- Safe to re-run.
-- =============================================================================

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete to authenticated using (
    user_id = auth.uid()
    or (public.is_group_owner(group_id) and role <> 'owner')
  );
