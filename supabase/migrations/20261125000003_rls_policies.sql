-- =============================================================
-- 0003_rls_policies.sql
-- Row Level Security, column-level grants and the public
-- creator directory view.
--
-- Principles:
--   * RLS enabled on every table; default is DENY.
--   * Users only read/write their own rows (or participate in
--     shared rows such as collaborations and conversations).
--   * Column-level grants prevent users from touching fields
--     they must never change: role, verification statuses, etc.
--   * public.is_admin() is SECURITY DEFINER so policies can
--     check the caller's role without recursing into profiles.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Enable RLS
-- -------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.business_profiles enable row level security;
alter table public.social_accounts enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.creator_services enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_applications enable row level security;
alter table public.collaboration_requests enable row level security;
alter table public.collaborations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.verifications enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;

-- -------------------------------------------------------------
-- 2. Column-level UPDATE grants (authenticated).
--    Anything not listed is immutable for normal users:
--      profiles.role / profiles.email, social_accounts.verification_*,
--      identity keys (ids, FK columns), etc.
-- -------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name, username, avatar_url, city, state, phone)
  on public.profiles to authenticated;

revoke update on public.creator_profiles from authenticated;
grant update (bio, niches, languages, content_types,
              collaboration_preferences, onboarding_step, onboarding_completed)
  on public.creator_profiles to authenticated;

revoke update on public.business_profiles from authenticated;
grant update (company_name, website, description, industry, onboarding_completed)
  on public.business_profiles to authenticated;

revoke update on public.social_accounts from authenticated;
grant update (username, platform_user_id, follower_count)
  on public.social_accounts to authenticated;

revoke update on public.portfolio_items from authenticated;
grant update (title, description, media_type, media_url, position)
  on public.portfolio_items to authenticated;

revoke update on public.creator_services from authenticated;
grant update (title, description, price, currency, active)
  on public.creator_services to authenticated;

revoke update on public.campaigns from authenticated;
grant update (title, description, category, platforms, collaboration_type,
              budget_min, budget_max, currency, deliverables,
              application_deadline, location, status)
  on public.campaigns to authenticated;

revoke update on public.campaign_applications from authenticated;
grant update (status) on public.campaign_applications to authenticated;

revoke update on public.collaboration_requests from authenticated;
grant update (status) on public.collaboration_requests to authenticated;

revoke update on public.collaborations from authenticated;
grant update (status, agreed_price, currency, terms, deliverables,
              revision_notes, deadline, submitted_at, completed_at)
  on public.collaborations to authenticated;

revoke update on public.conversations from authenticated;

revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

revoke update on public.verifications from authenticated;
grant update (status, method, review_notes, reviewed_by, expires_at)
  on public.verifications to authenticated;

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke update on public.reviews from authenticated;
grant update (rating, comment) on public.reviews to authenticated;

-- -------------------------------------------------------------
-- 3. profiles — private account data (email/phone visible to
--    owner and admins only; everyone else uses creator_directory)
-- -------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (id = auth.uid() or public.is_admin());

-- Rows are created by the handle_new_user trigger; no insert policy.

-- -------------------------------------------------------------
-- 4. creator_profiles — owner and admin only (public data is
--    exposed through the creator_directory view)
-- -------------------------------------------------------------
drop policy if exists creator_profiles_select on public.creator_profiles;
create policy creator_profiles_select on public.creator_profiles
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists creator_profiles_insert on public.creator_profiles;
create policy creator_profiles_insert on public.creator_profiles
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists creator_profiles_update on public.creator_profiles;
create policy creator_profiles_update on public.creator_profiles
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists creator_profiles_delete on public.creator_profiles;
create policy creator_profiles_delete on public.creator_profiles
  for delete to authenticated
  using (profile_id = auth.uid());

-- -------------------------------------------------------------
-- 5. business_profiles — company info is public marketplace data
-- -------------------------------------------------------------
drop policy if exists business_profiles_select on public.business_profiles;
create policy business_profiles_select on public.business_profiles
  for select to authenticated
  using (true);

drop policy if exists business_profiles_insert on public.business_profiles;
create policy business_profiles_insert on public.business_profiles
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists business_profiles_update on public.business_profiles;
create policy business_profiles_update on public.business_profiles
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists business_profiles_delete on public.business_profiles;
create policy business_profiles_delete on public.business_profiles
  for delete to authenticated
  using (profile_id = auth.uid());

-- -------------------------------------------------------------
-- 6. social_accounts — publicly readable display data; writable
--    only by the owner. Verification columns are excluded from
--    UPDATE grants (see section 2), so an owner can never mark
--    their own account verified.
-- -------------------------------------------------------------
drop policy if exists social_accounts_select on public.social_accounts;
create policy social_accounts_select on public.social_accounts
  for select to anon, authenticated
  using (true);

drop policy if exists social_accounts_insert on public.social_accounts;
create policy social_accounts_insert on public.social_accounts
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and verification_status = 'unverified'
    and verification_method is null
    and verified_at is null
  );

drop policy if exists social_accounts_update on public.social_accounts;
create policy social_accounts_update on public.social_accounts
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists social_accounts_delete on public.social_accounts;
create policy social_accounts_delete on public.social_accounts
  for delete to authenticated
  using (profile_id = auth.uid());

-- -------------------------------------------------------------
-- 7. portfolio_items / creator_services — public read, owner write
-- -------------------------------------------------------------
drop policy if exists portfolio_items_select on public.portfolio_items;
create policy portfolio_items_select on public.portfolio_items
  for select to anon, authenticated
  using (true);

drop policy if exists portfolio_items_insert on public.portfolio_items;
create policy portfolio_items_insert on public.portfolio_items
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists portfolio_items_update on public.portfolio_items;
create policy portfolio_items_update on public.portfolio_items
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists portfolio_items_delete on public.portfolio_items;
create policy portfolio_items_delete on public.portfolio_items
  for delete to authenticated
  using (profile_id = auth.uid());

drop policy if exists creator_services_select on public.creator_services;
create policy creator_services_select on public.creator_services
  for select to anon, authenticated
  using (true);

drop policy if exists creator_services_insert on public.creator_services;
create policy creator_services_insert on public.creator_services
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists creator_services_update on public.creator_services;
create policy creator_services_update on public.creator_services
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists creator_services_delete on public.creator_services;
create policy creator_services_delete on public.creator_services
  for delete to authenticated
  using (profile_id = auth.uid());

-- -------------------------------------------------------------
-- 8. campaigns — creators see only published/active campaigns;
--    businesses see and manage their own (business UI comes later)
-- -------------------------------------------------------------
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
  );

drop policy if exists campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns
  for insert to authenticated
  with check (
    status in ('draft', 'published')
    and exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = campaigns.business_profile_id
        and bp.profile_id = auth.uid()
    )
  );

drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns
  for update to authenticated
  using (
    exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = campaigns.business_profile_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = campaigns.business_profile_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns
  for delete to authenticated
  using (
    exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = campaigns.business_profile_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  );

-- -------------------------------------------------------------
-- 9. campaign_applications — visible to the applicant, the
--    campaign owner and admins. Insert only for the creator's
--    own profile against an open campaign; unique constraint
--    prevents duplicates. Status transitions are enforced by
--    the trigger from migration 0002.
-- -------------------------------------------------------------
drop policy if exists campaign_applications_select on public.campaign_applications;
create policy campaign_applications_select on public.campaign_applications
  for select to authenticated
  using (
    creator_profile_id = auth.uid()
    or exists (
      select 1
      from public.campaigns c
      join public.business_profiles bp
        on bp.profile_id = c.business_profile_id
      where c.id = campaign_applications.campaign_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists campaign_applications_insert on public.campaign_applications;
create policy campaign_applications_insert on public.campaign_applications
  for insert to authenticated
  with check (
    creator_profile_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1
      from public.campaigns c
      where c.id = campaign_applications.campaign_id
        and c.status in ('published', 'active')
        and (c.application_deadline is null
             or c.application_deadline > now())
    )
  );

drop policy if exists campaign_applications_update on public.campaign_applications;
create policy campaign_applications_update on public.campaign_applications
  for update to authenticated
  using (
    creator_profile_id = auth.uid()
    or exists (
      select 1
      from public.campaigns c
      join public.business_profiles bp
        on bp.profile_id = c.business_profile_id
      where c.id = campaign_applications.campaign_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    creator_profile_id = auth.uid()
    or exists (
      select 1
      from public.campaigns c
      join public.business_profiles bp
        on bp.profile_id = c.business_profile_id
      where c.id = campaign_applications.campaign_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  );

-- No delete policy: applications are withdrawn via status change.

-- -------------------------------------------------------------
-- 10. collaboration_requests — the invited creator and the
--     inviting business (and admins) can read; the creator
--     responds, the business cancels.
-- -------------------------------------------------------------
drop policy if exists collaboration_requests_select on public.collaboration_requests;
create policy collaboration_requests_select on public.collaboration_requests
  for select to authenticated
  using (
    creator_profile_id = auth.uid()
    or exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = collaboration_requests.business_profile_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists collaboration_requests_insert on public.collaboration_requests;
create policy collaboration_requests_insert on public.collaboration_requests
  for insert to authenticated
  with check (
    status = 'pending'
    and exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = collaboration_requests.business_profile_id
        and bp.profile_id = auth.uid()
    )
  );

drop policy if exists collaboration_requests_creator_respond on public.collaboration_requests;
create policy collaboration_requests_creator_respond on public.collaboration_requests
  for update to authenticated
  using (creator_profile_id = auth.uid() and status = 'pending')
  with check (
    creator_profile_id = auth.uid()
    and status in ('accepted', 'declined')
  );

drop policy if exists collaboration_requests_business_update on public.collaboration_requests;
create policy collaboration_requests_business_update on public.collaboration_requests
  for update to authenticated
  using (
    exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = collaboration_requests.business_profile_id
        and bp.profile_id = auth.uid()
    )
    and status = 'pending'
  )
  with check (
    exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = collaboration_requests.business_profile_id
        and bp.profile_id = auth.uid()
    )
    and status in ('pending', 'cancelled', 'expired')
  );

-- -------------------------------------------------------------
-- 11. collaborations — participants and admins only. Status
--     transitions are enforced by the trigger from 0002.
-- -------------------------------------------------------------
drop policy if exists collaborations_select on public.collaborations;
create policy collaborations_select on public.collaborations
  for select to authenticated
  using (
    creator_profile_id = auth.uid()
    or exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = collaborations.business_profile_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists collaborations_insert on public.collaborations;
create policy collaborations_insert on public.collaborations
  for insert to authenticated
  with check (
    status = 'negotiating'
    and (
      exists (
        select 1
        from public.business_profiles bp
        where bp.profile_id = collaborations.business_profile_id
          and bp.profile_id = auth.uid()
      )
      or public.is_admin()
    )
  );

drop policy if exists collaborations_update on public.collaborations;
create policy collaborations_update on public.collaborations
  for update to authenticated
  using (
    creator_profile_id = auth.uid()
    or exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = collaborations.business_profile_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    creator_profile_id = auth.uid()
    or exists (
      select 1
      from public.business_profiles bp
      where bp.profile_id = collaborations.business_profile_id
        and bp.profile_id = auth.uid()
    )
    or public.is_admin()
  );

-- No delete policy: collaborations are cancelled, not deleted.

-- -------------------------------------------------------------
-- 12. conversations — only the two participants of the linked
--     collaboration (and admins)
-- -------------------------------------------------------------
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated
  using (
    exists (
      select 1
      from public.collaborations c
      where c.id = conversations.collaboration_id
        and (c.creator_profile_id = auth.uid()
             or c.business_profile_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.collaborations c
      where c.id = conversations.collaboration_id
        and (c.creator_profile_id = auth.uid()
             or c.business_profile_id = auth.uid())
    )
  );

-- -------------------------------------------------------------
-- 13. messages — conversation participants only. A message can
--     only be sent as yourself; only the recipient may set
--     read_at (column grants restrict updates to read_at).
-- -------------------------------------------------------------
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.conversations cv
      join public.collaborations c
        on c.id = cv.collaboration_id
      where cv.id = messages.conversation_id
        and (c.creator_profile_id = auth.uid()
             or c.business_profile_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_profile_id = auth.uid()
    and read_at is null
    and exists (
      select 1
      from public.conversations cv
      join public.collaborations c
        on c.id = cv.collaboration_id
      where cv.id = messages.conversation_id
        and (c.creator_profile_id = auth.uid()
             or c.business_profile_id = auth.uid())
    )
  );

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated
  using (
    sender_profile_id <> auth.uid()
    and exists (
      select 1
      from public.conversations cv
      join public.collaborations c
        on c.id = cv.collaboration_id
      where cv.id = messages.conversation_id
        and (c.creator_profile_id = auth.uid()
             or c.business_profile_id = auth.uid())
    )
  )
  with check (
    sender_profile_id <> auth.uid()
    and exists (
      select 1
      from public.conversations cv
      join public.collaborations c
        on c.id = cv.collaboration_id
      where cv.id = messages.conversation_id
        and (c.creator_profile_id = auth.uid()
             or c.business_profile_id = auth.uid())
    )
  );

-- No delete policy: message history is immutable.

-- -------------------------------------------------------------
-- 14. verifications — claims are private (owner + admin).
--     Owners can only create 'pending' claims; only admins can
--     review them (column grants + policy). Nothing is ever
--     auto-verified.
-- -------------------------------------------------------------
drop policy if exists verifications_select on public.verifications;
create policy verifications_select on public.verifications
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists verifications_insert on public.verifications;
create policy verifications_insert on public.verifications
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and status = 'pending'
    and method is null
    and reviewed_by is null
    and review_notes is null
    and expires_at is null
  );

drop policy if exists verifications_update on public.verifications;
create policy verifications_update on public.verifications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists verifications_delete on public.verifications;
create policy verifications_delete on public.verifications
  for delete to authenticated
  using (
    (profile_id = auth.uid() and status in ('pending', 'expired'))
    or public.is_admin()
  );

-- -------------------------------------------------------------
-- 15. notifications — owner only. Anyone authenticated may
--     CREATE a notification for someone else (server code
--     inserts them); self-notification is pointless, spam risk
--     is accepted for the MVP and reviewed in Phase 8.
-- -------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (profile_id <> auth.uid() and read_at is null);

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (profile_id = auth.uid());

-- -------------------------------------------------------------
-- 16. reviews — publicly readable; only participants of a
--     completed collaboration may review their counterpart.
-- -------------------------------------------------------------
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select to anon, authenticated
  using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (
    reviewer_profile_id = auth.uid()
    and exists (
      select 1
      from public.collaborations c
      where c.id = reviews.collaboration_id
        and c.status = 'completed'
        and (
          (c.creator_profile_id = auth.uid()
           and reviews.reviewee_profile_id = c.business_profile_id)
          or (c.business_profile_id = auth.uid()
              and reviews.reviewee_profile_id = c.creator_profile_id)
        )
    )
  );

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews
  for update to authenticated
  using (reviewer_profile_id = auth.uid())
  with check (reviewer_profile_id = auth.uid());

-- -------------------------------------------------------------
-- 17. creator_directory — public-safe view of creator profiles.
--     The view runs with the privileges of its owner (postgres),
--     so it bypasses the owner-only table policies above while
--     exposing ONLY the columns listed here (no email/phone).
-- -------------------------------------------------------------
create or replace view public.creator_directory as
select
  p.id            as profile_id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.city,
  p.state,
  cp.bio,
  cp.niches,
  cp.languages,
  cp.content_types,
  cp.collaboration_preferences,
  p.created_at
from public.profiles p
join public.creator_profiles cp
  on cp.profile_id = p.id
where p.role = 'creator';

grant select on public.creator_directory to anon, authenticated;

-- -------------------------------------------------------------
-- 18. Anonymous role: read-only on public display data only.
--     Everything else (accounts, applications, messages,
--     collaborations, verifications, notifications) requires
--     an authenticated session; RLS gates every table anyway.
-- -------------------------------------------------------------
revoke all on all tables in schema public from anon;

grant select on
  public.social_accounts,
  public.portfolio_items,
  public.creator_services,
  public.reviews,
  public.creator_directory
to anon;
