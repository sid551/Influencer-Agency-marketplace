-- =============================================================
-- Bidding-style creator selection and visible campaign endings.
--
-- Creators already submit their rate through campaign_applications.
-- A business can now select several creators for the same campaign
-- at the rate they quoted, without automatically declining the rest.
-- Ended campaigns stay visible to creators who applied to them.
-- =============================================================

-- Replace single-winner finalization with multi-creator bid selection.
-- Existing calls from the message thread keep working; the selected
-- creator's quoted rate becomes the agreed price when none was negotiated.
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
  v_campaign_status text;
  v_business_id uuid;
  v_application_status text;
  v_expected_price numeric;
  v_collaboration_id uuid;
  v_collaboration_status text;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select ca.campaign_id, c.status, c.business_profile_id, ca.status, ca.expected_price
    into v_campaign_id, v_campaign_status, v_business_id, v_application_status, v_expected_price
    from public.campaign_applications ca
    join public.campaigns c on c.id = ca.campaign_id
   where ca.id = p_application_id;

  if not found then
    raise exception 'Application not found';
  end if;
  if v_business_id is distinct from v_actor then
    raise exception 'Not authorized to select this creator';
  end if;
  if v_campaign_status in ('closed', 'completed') then
    raise exception 'Reopen the campaign before selecting creators';
  end if;
  if v_application_status not in ('pending', 'accepted') then
    raise exception 'This creator can no longer be selected';
  end if;

  -- Accepting first is idempotent and fires the existing collaboration
  -- creation trigger, so direct selection needs no separate insert path.
  if v_application_status = 'pending' then
    update public.campaign_applications
       set status = 'accepted'
     where id = p_application_id;
  end if;

  select id, status
    into v_collaboration_id, v_collaboration_status
    from public.collaborations
   where application_id = p_application_id
   order by created_at
   limit 1;

  if v_collaboration_id is null then
    raise exception 'No collaboration exists for this application';
  end if;
  if v_collaboration_status not in ('negotiating', 'agreement_pending', 'active') then
    raise exception 'This collaboration is already closed';
  end if;

  -- The creator's quote is the bid. Keep an explicitly negotiated price
  -- when one already exists.
  update public.collaborations
     set agreed_price = coalesce(agreed_price, v_expected_price)
   where id = v_collaboration_id;

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

revoke all on function public.finalize_campaign_application(uuid) from public;
grant execute on function public.finalize_campaign_application(uuid) to authenticated;

-- Creators can still browse only live campaigns, but they can open the
-- details of ended campaigns they applied to so the final status is visible.
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns
  for select to authenticated
  using (
    status in ('published', 'active')
    or exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = campaigns.business_profile_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
    or (
      status in ('closed', 'completed')
      and exists (
        select 1
        from public.campaign_applications ca
        where ca.campaign_id = campaigns.id
          and ca.creator_profile_id = auth.uid()
      )
    )
  );
