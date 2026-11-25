-- =============================================================
-- 0002_functions_triggers.sql
-- Helper functions and triggers:
--   * set_updated_at      — auto-maintain updated_at
--   * is_admin            — SECURITY DEFINER admin check for RLS
--   * handle_new_user     — create profile (+ creator profile) on signup
--   * application status  — enforce allowed status transitions per actor
--   * collaboration status— enforce allowed status transitions per actor
-- =============================================================

-- -------------------------------------------------------------
-- updated_at maintenance
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists creator_profiles_updated_at on public.creator_profiles;
create trigger creator_profiles_updated_at
  before update on public.creator_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists business_profiles_updated_at on public.business_profiles;
create trigger business_profiles_updated_at
  before update on public.business_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists social_accounts_updated_at on public.social_accounts;
create trigger social_accounts_updated_at
  before update on public.social_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists portfolio_items_updated_at on public.portfolio_items;
create trigger portfolio_items_updated_at
  before update on public.portfolio_items
  for each row execute function public.set_updated_at();

drop trigger if exists creator_services_updated_at on public.creator_services;
create trigger creator_services_updated_at
  before update on public.creator_services
  for each row execute function public.set_updated_at();

drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

drop trigger if exists campaign_applications_updated_at on public.campaign_applications;
create trigger campaign_applications_updated_at
  before update on public.campaign_applications
  for each row execute function public.set_updated_at();

drop trigger if exists collaboration_requests_updated_at on public.collaboration_requests;
create trigger collaboration_requests_updated_at
  before update on public.collaboration_requests
  for each row execute function public.set_updated_at();

drop trigger if exists collaborations_updated_at on public.collaborations;
create trigger collaborations_updated_at
  before update on public.collaborations
  for each row execute function public.set_updated_at();

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

drop trigger if exists verifications_updated_at on public.verifications;
create trigger verifications_updated_at
  before update on public.verifications
  for each row execute function public.set_updated_at();

drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- is_admin — SECURITY DEFINER so policies can check the caller's
-- role without being blocked by the profiles RLS policies.
-- -------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- -------------------------------------------------------------
-- handle_new_user — runs on Supabase Auth sign-up.
-- Role is forced to 'creator' or 'business' (never 'admin'),
-- and creators get their onboarding row immediately.
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := case
    when new.raw_user_meta_data ->> 'role' = 'business' then 'business'
    else 'creator'
  end;
  v_username text := nullif(coalesce(new.raw_user_meta_data ->> 'username', ''), '');
begin
  if v_username is not null and v_username !~ '^[A-Za-z0-9_]{3,30}$' then
    v_username := null;
  end if;

  insert into public.profiles (id, role, email, full_name, username)
  values (
    new.id,
    v_role,
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ''),
    v_username
  )
  on conflict (id) do nothing;

  if v_role = 'creator' then
    insert into public.creator_profiles (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- Application status transitions.
--   * creator may only move pending → withdrawn
--   * campaign owner (business) may move
--       pending → shortlisted | accepted | rejected
--       shortlisted → accepted | rejected
--   * admins and service-role (no JWT) may do anything
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
    raise exception 'Creators may only withdraw applications that are pending';
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
           and v_new in ('accepted', 'rejected')) then
      return new;
    end if;
    raise exception 'Invalid application status transition';
  end if;

  raise exception 'Not authorized to change application status';
end;
$$;

drop trigger if exists campaign_applications_status_transition
  on public.campaign_applications;
create trigger campaign_applications_status_transition
  before update of status on public.campaign_applications
  for each row execute function public.enforce_application_status_transition();

-- -------------------------------------------------------------
-- Collaboration status transitions (actor-aware).
--   creator:   negotiating → agreement_pending
--              agreement_pending → negotiating | active
--              active → submitted | disputed
--              revision_requested → submitted | disputed
--              submitted → disputed
--              approved → completed
--              negotiating | agreement_pending → cancelled
--   business:  negotiating → agreement_pending
--              agreement_pending → negotiating | active
--              active → disputed
--              submitted → approved | revision_requested | disputed
--              revision_requested → disputed
--              approved → completed | disputed
--              negotiating | agreement_pending → cancelled
--   admins and service-role (no JWT) may do anything.
--   The creator can never self-approve (approved/completed
--   transitions for creator are limited as shown above).
-- -------------------------------------------------------------
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

drop trigger if exists collaborations_status_transition on public.collaborations;
create trigger collaborations_status_transition
  before update of status on public.collaborations
  for each row execute function public.enforce_collaboration_status_transition();
