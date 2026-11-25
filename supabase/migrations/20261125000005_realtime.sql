-- =============================================================
-- 0005_realtime.sql
-- Enable Supabase Realtime for the tables that need live
-- updates (messages in Phase 7, notifications in Phase 8).
-- Realtime respects RLS: clients only receive rows they can
-- read.
-- =============================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- Include the previous record in UPDATE/DELETE events so clients
-- can react to read-status changes.
alter table public.messages replica identity full;
