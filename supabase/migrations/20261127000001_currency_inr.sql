-- Relabel all marketplace money amounts as INR. Numeric values are unchanged;
-- this migration only changes currency codes/defaults and the invitation-to-
-- collaboration function that hardcodes a currency for new collaborations.

alter table public.creator_services
  alter column currency set default 'INR';

alter table public.campaigns
  alter column currency set default 'INR';

alter table public.campaign_applications
  alter column currency set default 'INR';

alter table public.collaborations
  alter column currency set default 'INR';

update public.creator_services
   set currency = 'INR'
 where currency is distinct from 'INR';

update public.campaigns
   set currency = 'INR'
 where currency is distinct from 'INR';

update public.campaign_applications
   set currency = 'INR'
 where currency is distinct from 'INR';

update public.collaborations
   set currency = 'INR'
 where currency is distinct from 'INR';

-- Same body as 20261125000006_phase7_collaborations.sql, with the inserted
-- currency literal changed from USD to INR. The existing trigger is preserved.
create or replace function public.create_collaboration_from_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collaboration_id uuid;
  v_application_id uuid;
begin
  if old.status is distinct from 'pending' or new.status <> 'accepted' then
    return new;
  end if;

  -- A pending request can only be accepted once under RLS; this guard
  -- also keeps admin-driven updates from opening duplicate threads.
  if exists (
    select 1
    from public.collaborations c
    where c.creator_profile_id = new.creator_profile_id
      and c.business_profile_id = new.business_profile_id
      and c.campaign_id is not distinct from new.campaign_id
      and c.status <> 'cancelled'
  ) then
    return new;
  end if;

  -- Link the accepted application when there is one (invitations can
  -- also be sent outside of the campaign application flow).
  select ca.id
    into v_application_id
    from public.campaign_applications ca
   where ca.campaign_id = new.campaign_id
     and ca.creator_profile_id = new.creator_profile_id
     and ca.status = 'accepted'
   limit 1;

  insert into public.collaborations (
    campaign_id,
    application_id,
    creator_profile_id,
    business_profile_id,
    status,
    currency,
    terms,
    deliverables
  ) values (
    new.campaign_id,
    v_application_id,
    new.creator_profile_id,
    new.business_profile_id,
    'negotiating',
    'INR',
    new.message,
    '[]'::jsonb
  )
  returning id into v_collaboration_id;

  insert into public.conversations (collaboration_id, created_by)
  values (v_collaboration_id, new.creator_profile_id);

  return new;
end;
$$;
