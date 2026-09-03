-- Adds lat/lng to profiles so the members map can plot everyone.
-- Run this once in the Supabase Dashboard SQL Editor.

alter table public.profiles add column if not exists lat double precision;
alter table public.profiles add column if not exists lng double precision;
