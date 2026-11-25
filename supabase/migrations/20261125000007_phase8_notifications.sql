-- =============================================================
-- Phase 8 — notifications for marketplace events.
--
-- Notifications are derived data: instead of asking every feature
-- action to remember to write one, database triggers emit them for
-- the events that matter (invitations, application decisions, new
-- messages, collaboration decisions and verification reviews).
--
-- All helpers are SECURITY DEFINER with a fixed search_path so they
-- work under the end user's RLS-scoped session. The actor check
-- (auth.uid()) suppresses self-notifications and system/seed writes
-- made without a JWT, which already contain their own history.
-- =============================================================

-- -------------------------------------------------------------
-- Shared insert helper. Truncates free text to the column limits
-- and never accepts a null recipient.
-- -------------------------------------------------------------
create or replace function public.create_notification(
  p_profile_id uuid,
  p_type       text,
  p_title      text,
  p_body       text default null,
  p_link_path  text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_profile_id is null then
    return;
  end if;

  insert into public.notifications
    (profile_id, type, title, body, link_path, read_at)
  values
    (p_profile_id,
     p_type,
     left(p_title, 200),
     left(p_body, 500),
     p_link_path,
     null);
end;
$$;

-- -------------------------------------------------------------
-- A new invitation from a business reaches its creator.
-- -------------------------------------------------------------
create or replace function public.notify_collaboration_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company  text;
  v_campaign text;
begin
  if auth.uid() is null or auth.uid() = new.creator_profile_id then
    return new;
  end if;

  select bp.company_name
    into v_company
    from public.business_profiles bp
   where bp.profile_id = new.business_profile_id;

  select c.title
    into v_campaign
    from public.campaigns c
   where c.id = new.campaign_id;

  perform public.create_notification(
    new.creator_profile_id,
    'collaboration_invitation',
    'New collaboration invitation',
    coalesce(v_company, 'A business') || ' invited you to collaborate'
      || case when v_campaign is null then '.' else ': ' || v_campaign end,
    '/creator/collaborations'
  );

  return new;
end;
$$;

drop trigger if exists collaboration_requests_notify on public.collaboration_requests;
create trigger collaboration_requests_notify
  after insert on public.collaboration_requests
  for each row execute function public.notify_collaboration_request();

-- -------------------------------------------------------------
-- Application decisions are always made by the business side, so
-- the creator is the recipient whenever the actor is someone else.
-- -------------------------------------------------------------
create or replace function public.notify_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign text;
  v_title    text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;
  if auth.uid() is null or auth.uid() = new.creator_profile_id then
    return new;
  end if;

  select c.title
    into v_campaign
    from public.campaigns c
   where c.id = new.campaign_id;

  v_title := case new.status
    when 'shortlisted' then 'Application shortlisted'
    when 'accepted' then 'Application accepted'
    when 'rejected' then 'Application update'
    when 'withdrawn' then 'Application withdrawn'
    else 'Application update'
  end;

  perform public.create_notification(
    new.creator_profile_id,
    'application_status',
    v_title,
    coalesce(v_campaign, 'Your application') || ' — status: ' || new.status,
    '/creator/applications'
  );

  return new;
end;
$$;

drop trigger if exists campaign_applications_notify_status on public.campaign_applications;
create trigger campaign_applications_notify_status
  after update of status on public.campaign_applications
  for each row execute function public.notify_application_status();

-- -------------------------------------------------------------
-- Messages notify the other party only. The link points at the
-- thread on the recipient's side (the business UI is a later phase).
-- -------------------------------------------------------------
create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator   uuid;
  v_business  uuid;
  v_recipient uuid;
  v_link      text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select c.creator_profile_id, c.business_profile_id
    into v_creator, v_business
    from public.conversations co
    join public.collaborations c on c.id = co.collaboration_id
   where co.id = new.conversation_id;

  if not found then
    return new;
  end if;

  if new.sender_profile_id = v_creator then
    v_recipient := v_business;
    v_link := '/business/messages/' || new.conversation_id::text;
  elsif new.sender_profile_id = v_business then
    v_recipient := v_creator;
    v_link := '/creator/messages/' || new.conversation_id::text;
  else
    return new;
  end if;

  perform public.create_notification(
    v_recipient,
    'message',
    'New message',
    new.body,
    v_link
  );

  return new;
end;
$$;

drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient
  after insert on public.messages
  for each row execute function public.notify_message_recipient();

-- -------------------------------------------------------------
-- Collaboration status changes made by the business notify the
-- creator. Creator-initiated changes (submit, complete) are skipped.
-- -------------------------------------------------------------
create or replace function public.notify_collaboration_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type  text;
  v_title text;
  v_body  text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;
  if auth.uid() is null or auth.uid() = new.creator_profile_id then
    return new;
  end if;

  case new.status
    when 'revision_requested' then
      v_type := 'revision_request';
      v_title := 'Changes requested';
      v_body := coalesce(new.revision_notes,
                         'The business requested changes to your deliverables.');
    when 'approved' then
      v_type := 'approval';
      v_title := 'Your work was approved';
      v_body := 'A collaboration was approved.';
    when 'completed' then
      v_type := 'completion';
      v_title := 'Collaboration completed';
      v_body := 'A collaboration was marked complete.';
    when 'active' then
      v_type := 'approval';
      v_title := 'Collaboration is active';
      v_body := 'Terms were agreed and the collaboration is now active.';
    when 'cancelled' then
      v_type := 'system';
      v_title := 'Collaboration cancelled';
      v_body := 'A collaboration was cancelled.';
    when 'disputed' then
      v_type := 'system';
      v_title := 'Collaboration disputed';
      v_body := 'A collaboration was marked as disputed.';
    else
      return new;
  end case;

  perform public.create_notification(
    new.creator_profile_id,
    v_type,
    v_title,
    v_body,
    '/creator/collaborations/' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists collaborations_notify_status on public.collaborations;
create trigger collaborations_notify_status
  after update of status on public.collaborations
  for each row execute function public.notify_collaboration_status();

-- -------------------------------------------------------------
-- Verification reviews notify the claim owner. Admins may review
-- with a service-role key (no JWT), so this trigger deliberately
-- does not require auth.uid() to be present.
-- -------------------------------------------------------------
create or replace function public.notify_verification_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_title := case new.status
    when 'verified' then 'Verification approved'
    when 'rejected' then 'Verification rejected'
    when 'expired' then 'Verification expired'
    when 'revoked' then 'Verification revoked'
    else 'Verification update'
  end;

  perform public.create_notification(
    new.profile_id,
    'system',
    v_title,
    coalesce(new.review_notes,
             'Your verification status changed to ' || new.status || '.'),
    '/creator/verification'
  );

  return new;
end;
$$;

drop trigger if exists verifications_notify_status on public.verifications;
create trigger verifications_notify_status
  after update of status on public.verifications
  for each row execute function public.notify_verification_status();

-- Realtime UPDATE events for notifications include the previous row,
-- matching the messages table behavior in 0005_realtime.sql.
alter table public.notifications replica identity full;
