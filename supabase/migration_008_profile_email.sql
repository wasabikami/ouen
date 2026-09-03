-- Adds an email column to profiles for shinEDO's claim_member() to populate,
-- but keeps it hidden from regular authenticated users (only admins, via
-- admin_list_users(), or security-definer functions like claim_member()
-- can read it — those run as postgres and bypass column grants).
-- Run this once in the Supabase Dashboard SQL Editor.

alter table public.profiles add column if not exists email text;

revoke select on public.profiles from authenticated;
grant select (id, name, job, area, message, op, menus, is_admin, is_paid, avatar_url, lat, lng, created_at)
  on public.profiles to authenticated;
