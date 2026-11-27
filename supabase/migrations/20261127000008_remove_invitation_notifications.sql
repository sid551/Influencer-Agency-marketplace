-- Remove the last invitation artifact: legacy notification rows and the
-- notification type itself. Historical migrations stay untouched.

-- Keep the history, but relabel it as an application/collaboration event so
-- no UI still needs an "Invitation" category.
update public.notifications n
   set type = case when p.role = 'creator'
                   then 'application_status' else 'system' end,
       title = case when p.role = 'creator'
                    then 'Application accepted' else 'Collaboration update' end,
       link_path = case when p.role = 'creator'
                        then '/creator/applications'
                        else '/business/collaborations' end
  from public.profiles p
 where p.id = n.profile_id
   and n.type = 'collaboration_invitation';

update public.notifications
   set type = 'system'
 where type = 'collaboration_invitation';

-- Drop every CHECK on notifications.type, then re-add the curated list.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
     where ns.nspname = 'public'
       and rel.relname = 'notifications'
       and con.contype = 'c'
       and con.conkey = array[
             (select attnum from pg_attribute
               where attrelid = rel.oid and attname = 'type')
           ]::smallint[]
  loop
    execute format('alter table public.notifications drop constraint %I', constraint_name);
  end loop;
end;
$$;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('application_status', 'message', 'deadline',
                  'revision_request', 'approval', 'completion', 'system'));
