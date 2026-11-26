-- =============================================================
-- Phase 13 — business notifications.
--
-- Phase 8 triggers notify creators when a business acts. The mirror
-- events (a creator applies, answers an invitation, or moves a
-- collaboration forward) had no business-side notification. These
-- triggers use the same SECURITY DEFINER helper with a fixed
-- search_path, and skip seed/system writes (no JWT) and self-events.
--
-- Every link_path resolves to an implemented /business route.
-- =============================================================

-- -------------------------------------------------------------
-- A new application reaches the owner of the campaign.
-- -------------------------------------------------------------
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
    '/business/applications/' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists campaign_applications_notify_business on public.campaign_applications;
create trigger campaign_applications_notify_business
  after insert on public.campaign_applications
  for each row execute function public.notify_business_new_application();

-- -------------------------------------------------------------
-- Invitation answers (accept/decline) reach the sending business.
-- -------------------------------------------------------------
create or replace function public.notify_business_invitation_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator text;
  v_title   text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;
  if auth.uid() is null or auth.uid() = new.business_profile_id then
    return new;
  end if;
  if new.status not in ('accepted', 'declined') then
    return new;
  end if;

  select coalesce(p.full_name, p.username, 'A creator')
    into v_creator
    from public.profiles p
   where p.id = new.creator_profile_id;

  v_title := case new.status
    when 'accepted' then 'Invitation accepted'
    else 'Invitation declined'
  end;

  perform public.create_notification(
    new.business_profile_id,
    'collaboration_invitation',
    v_title,
    coalesce(v_creator, 'A creator') || ' ' ||
      case new.status when 'accepted' then 'accepted' else 'declined' end ||
      ' your collaboration invitation.',
    '/business/invitations'
  );

  return new;
end;
$$;

drop trigger if exists collaboration_requests_notify_business_response on public.collaboration_requests;
create trigger collaboration_requests_notify_business_response
  after update of status on public.collaboration_requests
  for each row execute function public.notify_business_invitation_response();

-- -------------------------------------------------------------
-- Creator-initiated collaboration changes reach the business.
-- Business-initiated changes are already handled by the Phase 8
-- trigger (which notifies the creator), so the actor check keeps
-- the two directions from notifying the same party twice.
-- -------------------------------------------------------------
create or replace function public.notify_business_collaboration_status()
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
  if auth.uid() is null or auth.uid() is distinct from new.creator_profile_id then
    return new;
  end if;

  case new.status
    when 'negotiating' then
      v_type := 'system';
      v_title := 'Collaboration back in negotiation';
      v_body := 'The creator reopened the collaboration terms.';
    when 'agreement_pending' then
      v_type := 'approval';
      v_title := 'Terms ready for review';
      v_body := 'The creator proposed terms for your review.';
    when 'active' then
      v_type := 'approval';
      v_title := 'Collaboration is active';
      v_body := 'The creator agreed to the collaboration terms.';
    when 'submitted' then
      v_type := 'approval';
      v_title := 'Work submitted for review';
      v_body := 'The creator submitted deliverables for your review.';
    when 'revision_requested' then
      v_type := 'revision_request';
      v_title := 'Changes requested';
      v_body := 'The creator asked to revise the collaboration.';
    when 'approved' then
      v_type := 'approval';
      v_title := 'Collaboration approved';
      v_body := 'The collaboration was approved.';
    when 'completed' then
      v_type := 'completion';
      v_title := 'Collaboration completed';
      v_body := 'The creator marked the collaboration complete.';
    when 'cancelled' then
      v_type := 'system';
      v_title := 'Collaboration cancelled';
      v_body := 'The creator cancelled the collaboration.';
    when 'disputed' then
      v_type := 'system';
      v_title := 'Collaboration disputed';
      v_body := 'The creator marked the collaboration as disputed.';
    else
      return new;
  end case;

  perform public.create_notification(
    new.business_profile_id,
    v_type,
    v_title,
    v_body,
    '/business/collaborations/' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists collaborations_notify_business_status on public.collaborations;
create trigger collaborations_notify_business_status
  after update of status on public.collaborations
  for each row execute function public.notify_business_collaboration_status();
