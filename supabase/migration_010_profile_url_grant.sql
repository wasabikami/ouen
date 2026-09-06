-- Migration 010: let users read their own profiles.url
-- OUEN-APPのマイページ編集にサイト・SNSのURL欄を追加したため。
grant select (url) on public.profiles to authenticated;
