-- =============================================================
-- 0001_initial_schema.sql
-- Creator–Business Collaboration Marketplace — core schema
--
-- Conventions:
--   * UUID primary keys (gen_random_uuid)
--   * created_at / updated_at on mutable tables
--   * Status fields are text + CHECK constraints (simpler to
--     evolve than Postgres enum types)
--   * RLS is enabled in 0002_rls_policies.sql
-- =============================================================

-- -------------------------------------------------------------
-- profiles — one row per auth.users account (shared by both sides)
-- email mirrors auth.users and is only visible to the owner/admin.
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'creator'
                check (role in ('creator', 'business', 'admin')),
  email       text,
  phone       text,
  full_name   text,
  username    text
                check (username is null or username ~ '^[A-Za-z0-9_]{3,30}$'),
  avatar_url  text,
  city        text,
  state       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;

create index if not exists profiles_location_idx
  on public.profiles (city, state);

create index if not exists profiles_role_idx
  on public.profiles (role);

-- -------------------------------------------------------------
-- creator_profiles — creator-specific public/onboarding data
-- -------------------------------------------------------------
create table if not exists public.creator_profiles (
  profile_id               uuid primary key
                             references public.profiles (id) on delete cascade,
  bio                      text,
  niches                   text[] not null default '{}',
  languages                text[] not null default '{}',
  content_types            text[] not null default '{}',
  collaboration_preferences text[] not null default '{}',
  onboarding_completed     boolean not null default false,
  onboarding_step          integer not null default 0
                             check (onboarding_step between 0 and 12),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists creator_profiles_niches_idx
  on public.creator_profiles using gin (niches);

create index if not exists creator_profiles_languages_idx
  on public.creator_profiles using gin (languages);

-- -------------------------------------------------------------
-- business_profiles — structural support for campaigns (owned by
-- businesses). Business-facing features are NOT implemented yet.
-- -------------------------------------------------------------
create table if not exists public.business_profiles (
  profile_id           uuid primary key
                         references public.profiles (id) on delete cascade,
  company_name         text not null,
  website              text,
  description          text,
  industry             text,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists business_profiles_company_idx
  on public.business_profiles (company_name);

-- -------------------------------------------------------------
-- social_accounts — creator-linked social media accounts.
-- follower_count and usernames are self-reported; verification_*
-- columns are ONLY writable by the manual verification workflow
-- (column-level grants in 0002 prevent owners from setting them).
-- -------------------------------------------------------------
create table if not exists public.social_accounts (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null
                        references public.profiles (id) on delete cascade,
  platform            text not null
                        check (platform in ('instagram', 'youtube', 'facebook',
                                            'tiktok', 'x', 'linkedin', 'other')),
  username            text not null
                        check (char_length(username) between 1 and 100),
  platform_user_id    text,
  follower_count      bigint not null default 0
                        check (follower_count >= 0),
  verification_status text not null default 'unverified'
                        check (verification_status in ('unverified', 'pending',
                                                       'verified', 'rejected',
                                                       'expired', 'revoked')),
  verification_method text
                        check (verification_method is null or verification_method in
                               ('manual_review', 'oauth', 'ownership_link',
                                'email_challenge', 'platform_api')),
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint social_accounts_owner_unique unique (profile_id, platform, username)
);

create index if not exists social_accounts_profile_idx
  on public.social_accounts (profile_id);

create index if not exists social_accounts_platform_idx
  on public.social_accounts (platform);

create index if not exists social_accounts_followers_idx
  on public.social_accounts (follower_count desc);

-- -------------------------------------------------------------
-- portfolio_items — public showcase content (images, video links,
-- content samples). Stored in the public "portfolio" bucket when
-- uploaded, or an external URL for video links.
-- -------------------------------------------------------------
create table if not exists public.portfolio_items (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  description text,
  media_type  text not null
                check (media_type in ('image', 'video_link', 'content_sample')),
  media_url   text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists portfolio_items_profile_idx
  on public.portfolio_items (profile_id, position);

-- -------------------------------------------------------------
-- creator_services — paid services offered by a creator
-- -------------------------------------------------------------
create table if not exists public.creator_services (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  description text,
  price       numeric(12, 2) not null check (price >= 0),
  currency    text not null default 'USD'
                check (char_length(currency) = 3),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists creator_services_profile_idx
  on public.creator_services (profile_id);

-- -------------------------------------------------------------
-- campaigns — collaboration opportunities published by businesses.
-- Discoverable statuses are 'published' and 'active'.
-- -------------------------------------------------------------
create table if not exists public.campaigns (
  id                   uuid primary key default gen_random_uuid(),
  business_profile_id  uuid not null
                         references public.business_profiles (profile_id)
                         on delete cascade,
  title                text not null check (char_length(title) between 1 and 200),
  description          text not null check (char_length(description) > 0),
  category             text not null,
  platforms            text[] not null default '{}'
                         check (array_length(platforms, 1) >= 1
                                and platforms <@ array['instagram', 'youtube',
                                      'facebook', 'tiktok', 'x', 'linkedin',
                                      'other']::text[]),
  collaboration_type   text not null
                         check (collaboration_type in ('paid', 'ugc', 'affiliate',
                                                       'product_seeding',
                                                       'sponsorship', 'contest')),
  budget_min           numeric(12, 2) check (budget_min >= 0),
  budget_max           numeric(12, 2) check (budget_max >= 0),
  currency             text not null default 'USD'
                         check (char_length(currency) = 3),
  deliverables         text[] not null default '{}',
  application_deadline timestamptz,
  location             text,
  status               text not null default 'draft'
                         check (status in ('draft', 'published', 'active',
                                           'paused', 'closed', 'completed')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint campaigns_budget_range check
    (budget_max is null or budget_min is null or budget_max >= budget_min)
);

create index if not exists campaigns_status_idx
  on public.campaigns (status);

create index if not exists campaigns_category_idx
  on public.campaigns (category);

create index if not exists campaigns_platforms_idx
  on public.campaigns using gin (platforms);

create index if not exists campaigns_business_idx
  on public.campaigns (business_profile_id);

create index if not exists campaigns_deadline_idx
  on public.campaigns (application_deadline)
  where status in ('published', 'active');

-- -------------------------------------------------------------
-- campaign_applications — creator applications to campaigns.
-- The unique constraint prevents duplicate applications.
-- -------------------------------------------------------------
create table if not exists public.campaign_applications (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null
                       references public.campaigns (id) on delete cascade,
  creator_profile_id uuid not null
                       references public.creator_profiles (profile_id)
                       on delete cascade,
  proposal           text not null check (char_length(proposal) > 0),
  why_suitable       text,
  expected_price     numeric(12, 2) not null check (expected_price >= 0),
  currency           text not null default 'USD'
                       check (char_length(currency) = 3),
  status             text not null default 'pending'
                       check (status in ('pending', 'shortlisted', 'accepted',
                                         'rejected', 'withdrawn')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint campaign_applications_unique unique (campaign_id, creator_profile_id)
);

create index if not exists campaign_applications_creator_idx
  on public.campaign_applications (creator_profile_id, status);

create index if not exists campaign_applications_campaign_idx
  on public.campaign_applications (campaign_id, status);

create index if not exists campaign_applications_status_idx
  on public.campaign_applications (status);

-- -------------------------------------------------------------
-- collaboration_requests — direct invitations from businesses to
-- creators (structural support; business-side sending UI comes later)
-- -------------------------------------------------------------
create table if not exists public.collaboration_requests (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid
                         references public.campaigns (id) on delete set null,
  creator_profile_id   uuid not null
                         references public.creator_profiles (profile_id)
                         on delete cascade,
  business_profile_id  uuid not null
                         references public.business_profiles (profile_id)
                         on delete cascade,
  message              text,
  status               text not null default 'pending'
                         check (status in ('pending', 'accepted', 'declined',
                                           'expired', 'cancelled')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists collaboration_requests_creator_idx
  on public.collaboration_requests (creator_profile_id, status);

create index if not exists collaboration_requests_business_idx
  on public.collaboration_requests (business_profile_id, status);

-- At most one open invitation per creator/business pair per campaign
create unique index if not exists collaboration_requests_open_unique
  on public.collaboration_requests
    (creator_profile_id, business_profile_id,
     coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'pending';

-- -------------------------------------------------------------
-- collaborations — the agreement between a creator and a business.
-- deliverables is a JSON array:
--   [{ "id": uuid, "title": str, "due_date": date|null,
--      "status": "pending"|"submitted"|"approved", "asset_url": str|null }]
-- -------------------------------------------------------------
create table if not exists public.collaborations (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid references public.campaigns (id) on delete set null,
  application_id       uuid
                         references public.campaign_applications (id)
                         on delete set null,
  creator_profile_id   uuid not null
                         references public.creator_profiles (profile_id)
                         on delete cascade,
  business_profile_id  uuid not null
                         references public.business_profiles (profile_id)
                         on delete cascade,
  status               text not null default 'negotiating'
                         check (status in ('negotiating', 'agreement_pending',
                                           'active', 'submitted',
                                           'revision_requested', 'approved',
                                           'completed', 'cancelled', 'disputed')),
  agreed_price         numeric(12, 2) check (agreed_price >= 0),
  currency             text not null default 'USD'
                         check (char_length(currency) = 3),
  terms                text,
  deliverables         jsonb not null default '[]',
  revision_notes       text,
  deadline             timestamptz,
  submitted_at         timestamptz,
  completed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists collaborations_creator_idx
  on public.collaborations (creator_profile_id, status);

create index if not exists collaborations_business_idx
  on public.collaborations (business_profile_id, status);

create index if not exists collaborations_status_idx
  on public.collaborations (status);

-- -------------------------------------------------------------
-- conversations — one private thread per collaboration
-- -------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null unique
                     references public.collaborations (id) on delete cascade,
  created_by      uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists conversations_collaboration_idx
  on public.conversations (collaboration_id);

-- -------------------------------------------------------------
-- messages — 1:1 messages inside a conversation.
-- read_at is set by the recipient (non-sender).
-- -------------------------------------------------------------
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null
                     references public.conversations (id) on delete cascade,
  sender_profile_id uuid not null
                     references public.profiles (id) on delete cascade,
  body             text not null
                     check (char_length(body) between 1 and 10000),
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

create index if not exists messages_unread_idx
  on public.messages (conversation_id)
  where read_at is null;

-- -------------------------------------------------------------
-- verifications — separate claims per verification type.
-- Statuses: pending | verified | rejected | expired | revoked | manual_review
-- Nothing is ever "auto-verified": only the review workflow
-- (admin/service role) can set status to 'verified'.
-- -------------------------------------------------------------
create table if not exists public.verifications (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  type              text not null
                      check (type in ('email', 'phone', 'identity',
                                      'instagram_ownership', 'youtube_ownership',
                                      'audience_quality')),
  status            text not null default 'pending'
                      check (status in ('pending', 'verified', 'rejected',
                                        'expired', 'revoked', 'manual_review')),
  social_account_id uuid
                      references public.social_accounts (id) on delete set null,
  method            text
                      check (method is null or method in
                             ('manual_review', 'email_link', 'sms_code',
                              'document_check', 'oauth', 'platform_api')),
  reviewed_by       uuid references auth.users (id) on delete set null,
  review_notes      text,
  evidence_path     text,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint verifications_social_required check (
    (type in ('instagram_ownership', 'youtube_ownership')
     and social_account_id is not null)
    or type not in ('instagram_ownership', 'youtube_ownership')
  )
);

create index if not exists verifications_profile_idx
  on public.verifications (profile_id, type);

create index if not exists verifications_status_idx
  on public.verifications (status);

-- One open claim per (profile, type)
create unique index if not exists verifications_open_profile_type
  on public.verifications (profile_id, type)
  where status in ('pending', 'manual_review');

-- One open-or-approved claim per social account
create unique index if not exists verifications_open_social_account
  on public.verifications (social_account_id)
  where social_account_id is not null
    and status in ('pending', 'manual_review', 'verified');

-- -------------------------------------------------------------
-- notifications — in-app notifications for a profile
-- -------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type       text not null
               check (type in ('application_status', 'collaboration_invitation',
                               'message', 'deadline', 'revision_request',
                               'approval', 'completion', 'system')),
  title      text not null check (char_length(title) between 1 and 200),
  body       text,
  link_path  text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_idx
  on public.notifications (profile_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (profile_id)
  where read_at is null;

-- -------------------------------------------------------------
-- reviews — mutual reviews after a collaboration
-- -------------------------------------------------------------
create table if not exists public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  collaboration_id   uuid not null
                       references public.collaborations (id) on delete cascade,
  reviewer_profile_id uuid not null
                       references public.profiles (id) on delete cascade,
  reviewee_profile_id uuid not null
                       references public.profiles (id) on delete cascade,
  rating             integer not null check (rating between 1 and 5),
  comment            text
                       check (comment is null or char_length(comment) <= 2000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint reviews_unique unique (collaboration_id, reviewer_profile_id),
  constraint reviews_no_self check (reviewer_profile_id <> reviewee_profile_id)
);

create index if not exists reviews_reviewee_idx
  on public.reviews (reviewee_profile_id);

create index if not exists reviews_collaboration_idx
  on public.reviews (collaboration_id);
