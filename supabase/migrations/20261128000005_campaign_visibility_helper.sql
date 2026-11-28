-- =============================================================
-- Avoid recursive RLS when showing ended campaigns to applicants.
-- campaigns_select cannot query campaign_applications directly because
-- campaign_applications_select already checks the parent campaign.
-- A narrowly scoped security definer helper keeps the existence check
-- outside RLS while exposing only a boolean.
-- =============================================================

create or replace function public.has_creator_applied_to_campaign(
  p_campaign_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_applications ca
    where ca.campaign_id = p_campaign_id
      and ca.creator_profile_id = auth.uid()
  );
$$;

revoke all on function public.has_creator_applied_to_campaign(uuid) from public;
grant execute on function public.has_creator_applied_to_campaign(uuid) to authenticated;

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
      and public.has_creator_applied_to_campaign(campaigns.id)
    )
  );
