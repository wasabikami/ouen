-- OUEN-APP Supabase schema
-- Run this once in the Supabase Dashboard SQL Editor (Project > SQL Editor > New query).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  job text not null default '',
  area text not null default '',
  message text not null default '',
  op integer not null default 0,
  menus jsonb not null default '[]'::jsonb,
  is_admin boolean not null default false,
  is_paid boolean not null default false,
  avatar_url text,
  lat double precision,
  lng double precision,
  email text,  -- 一般ユーザーからは見えない列（下のcolumn-level grantで制限）。admin_list_users()や管理画面用。
  created_at timestamptz not null default now()
);

-- email列は、authenticatedロールのSELECT対象から外す（他の全会員から見えないようにするため）。
-- 既存のselect(*)クエリが壊れないよう、他の列だけを明示的に許可し直す。
revoke select on public.profiles from authenticated;
grant select (id, name, job, area, url, message, op, menus, is_admin, is_paid, avatar_url, lat, lng, status, member_type, created_at)
  on public.profiles to authenticated;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id),
  to_user_id uuid not null references public.profiles(id),
  menu_name text not null,
  items jsonb not null default '[]'::jsonb,
  price integer not null,
  paid integer not null,
  op integer not null default 0,
  message text,
  status text not null default 'pending' check (status in ('pending', 'received')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists transactions_from_user_id_idx on public.transactions(from_user_id);
create index if not exists transactions_to_user_id_idx on public.transactions(to_user_id);
create index if not exists transactions_created_at_idx on public.transactions(created_at desc);

-- Helper: is the currently authenticated user an admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Create an ouen transaction as 'pending'. OP is NOT credited yet — the
-- recipient must confirm receipt via confirm_ouen_transaction() first,
-- so a payer's self-reported "paid" amount alone can never inflate OP.
create or replace function public.create_ouen_transaction(
  p_to_user_id uuid,
  p_menu_name text,
  p_items jsonb,
  p_price integer,
  p_paid integer,
  p_message text
)
returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  v_op integer := greatest(p_paid - p_price, 0);
  v_tx public.transactions;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.transactions
    (from_user_id, to_user_id, menu_name, items, price, paid, op, message, status)
  values
    (auth.uid(), p_to_user_id, p_menu_name, p_items, p_price, p_paid, v_op, p_message, 'pending')
  returning * into v_tx;

  return v_tx;
end;
$$;

grant execute on function public.create_ouen_transaction(uuid, text, jsonb, integer, integer, text) to authenticated;

-- Only the recipient may confirm their own pending transaction. Confirming
-- credits OP exactly once, guarded by the pending -> received status flip.
create or replace function public.confirm_ouen_transaction(p_transaction_id uuid)
returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  v_tx public.transactions;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id;

  if v_tx is null then
    raise exception 'transaction not found';
  end if;
  if v_tx.to_user_id != auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_tx.status != 'pending' then
    raise exception 'transaction is not pending';
  end if;

  update public.transactions
    set status = 'received', confirmed_at = now()
    where id = p_transaction_id
    returning * into v_tx;

  if v_tx.op > 0 then
    update public.profiles set op = op + v_tx.op where id = v_tx.to_user_id;
  end if;

  return v_tx;
end;
$$;

grant execute on function public.confirm_ouen_transaction(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

-- profiles: anyone signed in can read all profiles (member list / timeline names),
-- can only create their own row, and can update their own row (or any row if admin).
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (is_admin());

-- transactions: anyone signed in can read all transactions (public timeline / admin view).
-- No direct INSERT policy: writes only happen through create_ouen_transaction().
-- Only admins can delete.
create policy "transactions_select_all" on public.transactions
  for select to authenticated using (true);

create policy "transactions_delete_admin" on public.transactions
  for delete to authenticated using (is_admin());

-- Profile photo storage: a public bucket where each user may only write
-- inside their own "{uid}/..." folder.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Admin-only: list users together with their email address.
-- profiles itself is readable by everyone, so email is deliberately kept
-- out of that table and only exposed through this admin-gated function.
create or replace function public.admin_list_users()
returns table (
  id uuid, name text, job text, area text, message text,
  op integer, menus jsonb, avatar_url text, is_admin boolean, is_paid boolean,
  created_at timestamptz, email text
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

create policy "avatar_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
