-- =============================================================
-- Close every open collaboration when a creator is not selected.
--
-- 0006 cancelled only negotiations in negotiating/agreement_pending.
-- A business can also move a collaboration to active before finalizing,
-- so rejecting a losing applicant could leave an active collaboration
-- behind. This migration lets the finalization helpers cancel any
-- non-completed collaboration through a narrowly scoped bypass flag,
-- without opening a general active -> cancelled transition in the UI.
-- =============================================================

-- Allow cancellation from any non-completed status only while a
-- finalization/decline helper has set the local bypass flag.
create or replace function public.enforce_collaboration_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_old text := old.status;
  v_new text := new.status;
  v_allowed boolean := false;
begin
  if v_old = v_new then
    return new;
  end if;

  if v_actor is null or public.is_admin() then
    return new;
  end if;

  if coalesce(current_setting('app.selection_finalization', true), '') = 'on'
     and v_new = 'cancelled'
     and v_old <> 'completed' then
    return new;
  end if;

  if new.creator_profile_id = v_actor then
    v_allowed :=
         (v_old = 'negotiating' and v_new = 'agreement_pending')
      or (v_old = 'agreement_pending' and v_new in ('negotiating', 'active'))
      or (v_old = 'active' and v_new in ('submitted', 'disputed'))
      or (v_old = 'revision_requested' and v_new in ('submitted', 'disputed'))
      or (v_old = 'submitted' and v_new = 'disputed')
      or (v_old = 'approved' and v_new = 'completed')
      or (v_old in ('negotiating', 'agreement_pending') and v_new = 'cancelled');
  elsif exists (
    select 1
    from public.business_profiles bp
    where bp.profile_id = new.business_profile_id
      and bp.profile_id = v_actor
  ) then
    v_allowed :=
         (v_old = 'negotiating' and v_new = 'agreement_pending')
      or (v_old = 'agreement_pending' and v_new in ('negotiating', 'active'))
      or (v_old = 'active' and v_new = 'disputed')
      or (v_old = 'submitted'
          and v_new in ('approved', 'revision_requested', 'disputed'))
      or (v_old = 'revision_requested' and v_new = 'disputed')
      or (v_old = 'approved' and v_new in ('completed', 'disputed'))
      or (v_old in ('negotiating', 'agreement_pending') and v_new = 'cancelled');
  end if;

  if not v_allowed then
    raise exception 'Invalid collaboration status transition for this user';
  end if;

  return new;
end;
$$;

-- The existing collaborations_status_transition trigger keeps its name;
-- only the function above is replaced.

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

  perform set_config('app.selection_finalization', 'on', true);

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
       and status not in ('completed', 'cancelled');

    update public.campaign_applications
       set status = 'rejected'
     where id = v_other.id;
  end loop;

  perform set_config('app.selection_finalization', '', true);

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

  perform set_config('app.selection_finalization', 'on', true);

  update public.collaborations
     set status = 'cancelled'
   where application_id = p_application_id
     and status not in ('completed', 'cancelled');

  perform set_config('app.selection_finalization', '', true);

  update public.campaign_applications
     set status = 'rejected'
   where id = p_application_id;

  return true;
end;
$$;

revoke all on function public.finalize_campaign_application(uuid) from public;
grant execute on function public.finalize_campaign_application(uuid) to authenticated;

revoke all on function public.reject_accepted_application(uuid) from public;
grant execute on function public.reject_accepted_application(uuid) to authenticated;
