-- Lets admins delete a user's profile from the admin screen.
-- Run this once in the Supabase Dashboard SQL Editor.
--
-- Note: if the user has transaction history, deletion will fail with a
-- foreign key error (transactions.from_user_id/to_user_id reference
-- profiles.id with no cascade) — that's intentional, so financial
-- history is never silently lost. Delete their transactions first if
-- you really need to remove such a user.

create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (is_admin());
