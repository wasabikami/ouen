-- Migration 009: let users read their own profiles.status
-- shinEDO統合後、承認待ち(pending)のユーザーはOUEN-APPを使えないようにするため、
-- AuthContextでstatusを読めるようにする。
grant select (status) on public.profiles to authenticated;
