-- =============================================================
-- Multi-application negotiations and final selection.
--
-- A business may accept several applications to one campaign. Each accepted
-- application gets its own collaboration and conversation, where either side
-- can negotiate price and scope. Once a price is agreed, the business can
-- finalize one creator: that collaboration becomes active and the other
-- accepted applications are declined with their open negotiations cancelled.
--
-- Historical migrations are left untouched. This migration widens the status
-- CHECK/constraint trigger and adds atomic SECURITY DEFINER helpers with a
-- fixed search_path so the end user's RLS-scoped session can use them.
-- =============================================================

-- -------------------------------------------------------------
-- campaign_applications.status: add the final selection state.
-- -------------------------------------------------------------
alter table public.campaign_applications
  drop constraint if exists campaign_applications_status_check;

alter table public.campaign_applications
  add constraint campaign_applications_status_check
  check (status in ('pending', 'shortlisted', 'accepted', 'finalized',
                    'rejected', 'withdrawn'));

-- -------------------------------------------------------------
-- Application transitions.
--   creator: pending → withdrawn
--            shortlisted | accepted → rejected (declining an offer)
--   business: pending → shortlisted | accepted | rejected
--             shortlisted → accepted | rejected
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
    if v_old in ('shortlisted', 'accepted') and v_new = 'rejected' then
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
    if (v_old = 'pending'
        and v_new in ('shortlisted', 'accepted', 'rejected'))
       or (v_old = 'shortlisted'
           and v_new in ('accepted', 'rejected'))
       or (v_old = 'accepted'
           and v_new in ('finalized', 'rejected')) then
      return new;
    end if;
    raise exception 'Invalid application status transition';
  end if;

  raise exception 'Not authorized to change application status';
end;
$$;

-- The existing trigger from migration 0002 keeps its name; only the
-- function above is replaced.

-- -------------------------------------------------------------
-- Finalize one accepted application. The chosen creator's collaboration
-- becomes active; every other accepted applicant on the campaign is rejected
-- and its open negotiation is cancelled.
-- -------------------------------------------------------------
create or replace function public.finalize_campaign_application(
  p_application_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_campaign_id uuid;
  v_business_id uuid;
  v_application_status text;
  v_collaboration_id uuid;
  v_collaboration_status text;
  v_agreed_price numeric;
  v_other record;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select ca.campaign_id, ca.status, c.business_profile_id
    into v_campaign_id, v_application_status, v_business_id
    from public.campaign_applications ca
    join public.campaigns c on c.id = ca.campaign_id
   where ca.id = p_application_id;

  if not found then
    raise exception 'Application not found';
  end if;
  if v_business_id is distinct from v_actor then
    raise exception 'Not authorized to finalize this application';
  end if;
  if v_application_status <> 'accepted' then
    raise exception 'Only accepted applications can be finalized';
  end if;

  select c.id, c.status, c.agreed_price
    into v_collaboration_id, v_collaboration_status, v_agreed_price
    from public.collaborations c
   where c.application_id = p_application_id
   order by c.created_at
   limit 1;

  if v_collaboration_id is null then
    raise exception 'No negotiation exists for this application';
  end if;
  if v_collaboration_status not in ('negotiating', 'agreement_pending', 'active') then
    raise exception 'This negotiation is already closed';
  end if;
  if v_agreed_price is null then
    raise exception 'Agree on a price with this creator before finalizing';
  end if;

  -- Decline the other creators first, while their applications are still
  -- accepted, then close their negotiations.
  for v_other in
    select id
      from public.campaign_applications
     where campaign_id = v_campaign_id
       and status = 'accepted'
       and id <> p_application_id
     order by created_at
  loop
    update public.collaborations
       set status = 'cancelled'
     where application_id = v_other.id
       and status in ('negotiating', 'agreement_pending');

    update public.campaign_applications
       set status = 'rejected'
     where id = v_other.id;
  end loop;

  -- Two small transitions keep the authoritative collaboration trigger happy:
  -- negotiating → agreement_pending → active.
  if v_collaboration_status = 'negotiating' then
    update public.collaborations
       set status = 'agreement_pending'
     where id = v_collaboration_id;
  end if;

  if v_collaboration_status <> 'active' then
    update public.collaborations
       set status = 'active'
     where id = v_collaboration_id;
  end if;

  update public.campaign_applications
     set status = 'finalized'
   where id = p_application_id;

  return true;
end;
$$;

-- -------------------------------------------------------------
-- Business declines an accepted application and closes its negotiation.
-- -------------------------------------------------------------
create or replace function public.reject_accepted_application(
  p_application_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_business_id uuid;
  v_status text;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select ca.status, c.business_profile_id
    into v_status, v_business_id
    from public.campaign_applications ca
    join public.campaigns c on c.id = ca.campaign_id
   where ca.id = p_application_id;

  if not found then
    raise exception 'Application not found';
  end if;
  if v_business_id is distinct from v_actor then
    raise exception 'Not authorized to review this application';
  end if;
  if v_status <> 'accepted' then
    raise exception 'Only accepted applications can be declined here';
  end if;

  update public.collaborations
     set status = 'cancelled'
   where application_id = p_application_id
     and status in ('negotiating', 'agreement_pending');

  update public.campaign_applications
     set status = 'rejected'
   where id = p_application_id;

  return true;
end;
$$;

-- -------------------------------------------------------------
-- Creator declines the work and closes the application.
-- -------------------------------------------------------------
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

    if v_application_status in ('shortlisted', 'accepted') then
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

revoke all on function public.finalize_campaign_application(uuid) from public;
grant execute on function public.finalize_campaign_application(uuid) to authenticated;

revoke all on function public.reject_accepted_application(uuid) from public;
grant execute on function public.reject_accepted_application(uuid) to authenticated;

revoke all on function public.decline_creator_collaboration(uuid) from public;
grant execute on function public.decline_creator_collaboration(uuid) to authenticated;
