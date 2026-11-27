-- Remove the shortlist step. Businesses now only accept or decline an
-- application, then finalize one of the accepted creators. Historical
-- migrations are left untouched; this migration updates live data, the status
-- constraint and the functions that still know about 'shortlisted'.

-- Existing shortlisted applicants go back to pending so nobody is silently
-- pushed into a negotiation they did not agree to.
update public.campaign_applications
   set status = 'pending'
 where status = 'shortlisted';

alter table public.campaign_applications
  drop constraint if exists campaign_applications_status_check;

alter table public.campaign_applications
  add constraint campaign_applications_status_check
  check (status in ('pending', 'accepted', 'finalized', 'rejected', 'withdrawn'));

-- -------------------------------------------------------------
-- Application transitions without a shortlist step.
--   creator: pending → withdrawn
--            accepted → rejected (declining an offer)
--   business: pending → accepted | rejected
--             accepted → finalized | rejected
--   admins/service-role: unrestricted
-- -------------------------------------------------------------
create or replace function public.enforce_application_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_old text := old.status;
  v_new text := new.status;
  v_is_campaign_owner boolean;
begin
  if v_old = v_new then
    return new;
  end if;

  -- Service role / SQL (no JWT context): unrestricted
  if v_actor is null or public.is_admin() then
    return new;
  end if;

  if new.creator_profile_id = v_actor then
    if v_old = 'pending' and v_new = 'withdrawn' then
      return new;
    end if;
    if v_old = 'accepted' and v_new = 'rejected' then
      return new;
    end if;
    raise exception 'Creators may only withdraw pending applications or decline offers';
  end if;

  select exists (
    select 1
    from public.campaigns c
    join public.business_profiles bp
      on bp.profile_id = c.business_profile_id
    where c.id = new.campaign_id
      and bp.profile_id = v_actor
  ) into v_is_campaign_owner;

  if v_is_campaign_owner then
    if (v_old = 'pending' and v_new in ('accepted', 'rejected'))
       or (v_old = 'accepted' and v_new in ('finalized', 'rejected')) then
      return new;
    end if;
    raise exception 'Invalid application status transition';
  end if;

  raise exception 'Not authorized to change application status';
end;
$$;

-- Creator notifications no longer mention a shortlist state.
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

-- A creator declining negotiation only closes an accepted application.
create or replace function public.decline_creator_collaboration(
  p_collaboration_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_application_id uuid;
  v_collaboration_status text;
  v_application_status text;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select application_id, status
    into v_application_id, v_collaboration_status
    from public.collaborations
   where id = p_collaboration_id
     and creator_profile_id = v_actor;

  if not found then
    raise exception 'Collaboration not found';
  end if;
  if v_collaboration_status not in ('negotiating', 'agreement_pending') then
    raise exception 'This collaboration is no longer open for negotiation';
  end if;

  if v_application_id is not null then
    select status
      into v_application_status
      from public.campaign_applications
     where id = v_application_id;

    if v_application_status = 'accepted' then
      update public.campaign_applications
         set status = 'rejected'
       where id = v_application_id;
    end if;
  end if;

  update public.collaborations
     set status = 'cancelled'
   where id = p_collaboration_id;

  return true;
end;
$$;

-- Existing notification text may still name the removed step; normalise it
-- without touching unrelated notifications.
update public.notifications
   set title = 'Application update'
 where type = 'application_status'
   and title = 'Application shortlisted';
