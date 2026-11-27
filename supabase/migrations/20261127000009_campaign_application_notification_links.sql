-- Application reviews live inside their campaign, not in a global list.
-- Repoint the live notification trigger and any stored legacy links.

create or replace function public.notify_business_new_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_campaign text;
  v_creator  text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select c.business_profile_id, c.title
    into v_business, v_campaign
    from public.campaigns c
   where c.id = new.campaign_id;

  if not found or auth.uid() = v_business then
    return new;
  end if;

  select coalesce(p.full_name, p.username, 'A creator')
    into v_creator
    from public.profiles p
   where p.id = new.creator_profile_id;

  perform public.create_notification(
    v_business,
    'application_status',
    'New application received',
    coalesce(v_creator, 'A creator') || ' applied to '
      || coalesce(v_campaign, 'your campaign') || '.',
    '/business/campaigns/' || new.campaign_id::text || '/applications'
  );

  return new;
end;
$$;

-- Existing "New application received" rows still point at the removed list.
update public.notifications n
   set link_path = '/business/campaigns/' || ca.campaign_id::text || '/applications'
  from public.campaign_applications ca
 where n.type = 'application_status'
   and n.link_path = '/business/applications/' || ca.id::text;

update public.notifications
   set link_path = '/business/campaigns'
 where link_path = '/business/applications';
