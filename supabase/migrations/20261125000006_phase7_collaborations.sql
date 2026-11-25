-- =============================================================
-- Phase 7 — collaborations and messaging support.
--
-- Two small database behaviors that cannot be expressed safely with
-- the creator's RLS-scoped session:
--   1. Accepting a collaboration invitation opens the collaboration
--      (only the business side may INSERT collaborations under RLS).
--   2. Sending a message bumps the conversation's updated_at so the
--      inbox sorts by most recent activity (conversations are not
--      user-updatable under RLS).
-- Both functions are SECURITY DEFINER with a fixed search_path and
-- are idempotent by construction.
-- =============================================================

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
    'USD',
    new.message,
    '[]'::jsonb
  )
  returning id into v_collaboration_id;

  insert into public.conversations (collaboration_id, created_by)
  values (v_collaboration_id, new.creator_profile_id);

  return new;
end;
$$;

drop trigger if exists collaboration_requests_create_collaboration on public.collaboration_requests;
create trigger collaboration_requests_create_collaboration
  after update of status on public.collaboration_requests
  for each row execute function public.create_collaboration_from_request();

-- -------------------------------------------------------------

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();
