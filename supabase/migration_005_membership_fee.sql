-- Adds a manually-managed "月会費(500円)を支払い済みか" flag to profiles.
-- Run this once in the Supabase Dashboard SQL Editor.
--
-- Payment itself is NOT handled here (no Stripe/webhook) — an admin
-- confirms payment out-of-band (bank transfer, PayPay, etc.) and flips
-- this flag from the admin screen.

alter table public.profiles add column if not exists is_paid boolean not null default false;

-- admin_list_users() must be dropped first: its return columns are changing.
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid,
  name text,
  job text,
  area text,
  message text,
  op integer,
  menus jsonb,
  avatar_url text,
  is_admin boolean,
  is_paid boolean,
  created_at timestamptz,
  email text
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select p.id, p.name, p.job, p.area, p.message, p.op, p.menus,
         p.avatar_url, p.is_admin, p.is_paid, p.created_at, u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
