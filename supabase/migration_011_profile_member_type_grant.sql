-- Migration 011: let users read profiles.member_type
-- OUEN-APPのメンバー地図でも匠(青)/一般(黄)のピン色分けをするため。
grant select (member_type) on public.profiles to authenticated;
