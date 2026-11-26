-- =============================================================
-- seed.sql — development seed data
-- Creates three demo accounts (2 creators + 1 business) with
-- campaigns, applications, a collaboration, messages,
-- notifications and verification claims.
--
-- Demo logins (after Phase 3 auth UI exists):
--   mia@example.com   / password123  (creator, onboarded)
--   rahul@example.com / password123  (creator, partial onboarding)
--   acme@example.com  / password123  (business — onboarding complete)
--
-- Idempotent: safe to re-run (uses fixed UUIDs + ON CONFLICT).
-- =============================================================

-- -------------------------------------------------------------
-- Demo auth users. handle_new_user (migration 0002) creates the
-- matching profiles automatically.
-- -------------------------------------------------------------
do $$
declare
  v_hash text := null;
begin
  begin
    create extension if not exists pgcrypto with schema extensions;
    v_hash := extensions.crypt('password123', extensions.gen_salt('bf'));
  exception when others then
    raise notice 'pgcrypto unavailable: demo users are created without passwords';
  end;

  -- GoTrue scans these token columns as strings, so hand-seeded users
  -- must use '' rather than NULL or password login fails with a 500.
  insert into auth.users
    (instance_id, id, aud, role, email, encrypted_password,
     confirmation_token, email_change, email_change_token_new,
     recovery_token, email_confirmed_at, raw_app_meta_data,
     raw_user_meta_data, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000',
     '11111111-1111-4111-8111-111111111111',
     'authenticated', 'authenticated', 'mia@example.com', v_hash,
     '', '', '', '', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"creator","full_name":"Mia Chen"}'::jsonb,
     now(), now()),
    ('00000000-0000-0000-0000-000000000000',
     '22222222-2222-4222-8222-222222222222',
     'authenticated', 'authenticated', 'rahul@example.com', v_hash,
     '', '', '', '', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"creator","full_name":"Rahul Verma"}'::jsonb,
     now(), now()),
    ('00000000-0000-0000-0000-000000000000',
     '33333333-3333-4333-8333-333333333333',
     'authenticated', 'authenticated', 'acme@example.com', v_hash,
     '', '', '', '', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"business","full_name":"Acme Drinks Co."}'::jsonb,
     now(), now())
  on conflict (id) do nothing;
end $$;

-- -------------------------------------------------------------
-- Profile details (trigger already created the rows)
-- -------------------------------------------------------------
update public.profiles
set username = 'mia_creates',
    city = 'Mumbai',
    state = 'Maharashtra',
    phone = '+91 9876543210'
where id = '11111111-1111-4111-8111-111111111111';

update public.profiles
set username = 'rahul_moves',
    city = 'Bengaluru',
    state = 'Karnataka',
    phone = '+91 9812345678'
where id = '22222222-2222-4222-8222-222222222222';

update public.profiles
set username = 'acme_drinks',
    city = 'Delhi',
    state = 'Delhi'
where id = '33333333-3333-4333-8333-333333333333';

-- -------------------------------------------------------------
-- Creator profiles
-- -------------------------------------------------------------
update public.creator_profiles
set bio = 'Fashion and lifestyle creator sharing daily outfit
inspiration, honest product reviews and sustainable style tips.',
    niches = array['fashion', 'lifestyle'],
    languages = array['english', 'hindi'],
    content_types = array['reels', 'stories', 'photos'],
    collaboration_preferences = array['paid', 'product_seeding'],
    onboarding_completed = true,
    onboarding_step = 12
where profile_id = '11111111-1111-4111-8111-111111111111';

update public.creator_profiles
set bio = 'Fitness creator helping busy professionals build
sustainable workout habits.',
    niches = array['fitness', 'wellness'],
    languages = array['hindi', 'english'],
    content_types = array['reels', 'long_form'],
    collaboration_preferences = array['paid'],
    onboarding_completed = false,
    onboarding_step = 4
where profile_id = '22222222-2222-4222-8222-222222222222';

-- -------------------------------------------------------------
-- Business profile used by the demo campaigns
-- -------------------------------------------------------------
insert into public.business_profiles
  (profile_id, company_name, website, description, industry,
   onboarding_completed)
values
  ('33333333-3333-4333-8333-333333333333',
   'Acme Drinks Co.',
   'https://acme.example.com',
   'We make sparkling drinks with real fruit and no added sugar.',
   'Food & Beverage',
   true)
on conflict (profile_id) do nothing;

-- -------------------------------------------------------------
-- Social accounts (self-reported follower counts; verification
-- columns stay 'unverified' until the review workflow sets them)
-- -------------------------------------------------------------
insert into public.social_accounts
  (id, profile_id, platform, username, platform_user_id, follower_count)
values
  ('aaaaaaaa-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'instagram', 'mia_creates', '17841400000000001', 128000),
  ('aaaaaaaa-0000-4000-8000-000000000002',
   '11111111-1111-4111-8111-111111111111',
   'youtube', 'MiaCreates', 'UC17841400000000001', 45000),
  ('aaaaaaaa-0000-4000-8000-000000000003',
   '22222222-2222-4222-8222-222222222222',
   'instagram', 'rahul_moves', '17841400000000002', 23000)
on conflict (profile_id, platform, username) do nothing;

-- -------------------------------------------------------------
-- Portfolio items (local placeholder media that renders via
-- next/image; real uploads replace these in Phase 5)
-- -------------------------------------------------------------
insert into public.portfolio_items
  (id, profile_id, title, description, media_type, media_url, position)
values
  ('bbbbbbbb-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'Summer lookbook reel',
   '60-second reel showcasing a summer capsule wardrobe.',
   'image', '/globe.svg', 0),
  ('bbbbbbbb-0000-4000-8000-000000000002',
   '11111111-1111-4111-8111-111111111111',
   'Sustainable denim review',
   'Long-form review of five sustainable denim brands.',
   'video_link', 'https://www.youtube.com/watch?v=demo', 1),
  ('bbbbbbbb-0000-4000-8000-000000000003',
   '22222222-2222-4222-8222-222222222222',
   'Desk workout challenge',
   'Carousel teaching four exercises for desk workers.',
   'image', '/file.svg', 0)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Services
-- -------------------------------------------------------------
insert into public.creator_services
  (id, profile_id, title, description, price, currency, active)
values
  ('cccccccc-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'Instagram Reel (integration)',
   'One 30-60s reel featuring your product, including one revision.',
   900.00, 'USD', true),
  ('cccccccc-0000-4000-8000-000000000002',
   '11111111-1111-4111-8111-111111111111',
   'Story set (3 frames)',
   'Three-frame story sequence with link sticker and swipe-up.',
   350.00, 'USD', true),
  ('cccccccc-0000-4000-8000-000000000003',
   '22222222-2222-4222-8222-222222222222',
   'Workout demo video',
   '30s form-check video for fitness products.',
   400.00, 'USD', true)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Campaigns: two discoverable (published/active), one draft
-- (must NOT appear in discovery)
-- -------------------------------------------------------------
insert into public.campaigns
  (id, business_profile_id, title, description, category, platforms,
   collaboration_type, budget_min, budget_max, currency, deliverables,
   application_deadline, location, status)
values
  ('dddddddd-0000-4000-8000-000000000001',
   '33333333-3333-4333-8333-333333333333',
   'Summer Fashion Reel Campaign',
   'Showcase our new summer collection in a stylised reel. We are
looking for creators with an engaged fashion audience who can
deliver bright, energetic content.',
   'Fashion',
   array['instagram', 'tiktok'],
   'paid',
   500.00, 1500.00, 'USD',
   array['1 Instagram Reel', '2 Story frames'],
   now() + interval '14 days',
   'Mumbai',
   'published'),
  ('dddddddd-0000-4000-8000-000000000002',
   '33333333-3333-4333-8333-333333333333',
   '30-Day Fitness Challenge UGC',
   'Create authentic UGC showing how our energy drink fits into a
30-day fitness challenge. Performance-style content preferred.',
   'Fitness',
   array['instagram', 'youtube'],
   'ugc',
   200.00, 800.00, 'USD',
   array['3 Reels', '1 Long-form video'],
   now() + interval '7 days',
   'Remote',
   'active'),
  ('dddddddd-0000-4000-8000-000000000003',
   '33333333-3333-4333-8333-333333333333',
   'Energy Drink Launch (internal draft)',
   'Draft campaign that must not be visible in discovery.',
   'Food & Beverage',
   array['instagram'],
   'sponsorship',
   1000.00, 5000.00, 'USD',
   array['1 Reel'],
   now() + interval '30 days',
   'Delhi',
   'draft')
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Applications
-- -------------------------------------------------------------
insert into public.campaign_applications
  (id, campaign_id, creator_profile_id, proposal, why_suitable,
   expected_price, currency, status)
values
  ('eeeeeeee-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'I create fashion reels that regularly cross 50k views, and my
audience trusts my styling recommendations. I can shoot within
your campaign window and deliver bright, on-brand content.',
   'My niche is fashion/lifestyle and 68% of my audience is aged
18-34 — exactly your target segment.',
   900.00, 'USD', 'accepted'),
  ('eeeeeeee-0000-4000-8000-000000000002',
   'dddddddd-0000-4000-8000-000000000001',
   '22222222-2222-4222-8222-222222222222',
   'Fitness content is my core specialty and I can show the
collection as part of active workout routines.',
   'Engaged fitness audience with strong reel retention.',
   650.00, 'USD', 'pending'),
  ('eeeeeeee-0000-4000-8000-000000000003',
   'dddddddd-0000-4000-8000-000000000002',
   '22222222-2222-4222-8222-222222222222',
   'I run monthly fitness challenges with my community and can
document a real 30-day journey with your product.',
   'Authentic fitness UGC with measurable audience participation.',
   400.00, 'USD', 'shortlisted')
on conflict (campaign_id, creator_profile_id) do nothing;

-- -------------------------------------------------------------
-- Pending invitation (creator side shows this as "pending
-- invitation"; sending UI is business-side, future phase)
-- -------------------------------------------------------------
insert into public.collaboration_requests
  (id, campaign_id, creator_profile_id, business_profile_id, message,
   status)
values
  ('ffffffff-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000001',
   '22222222-2222-4222-8222-222222222222',
   '33333333-3333-4333-8333-333333333333',
   'We loved your challenge series — would you like to join our
summer campaign as a paid partner?',
   'pending')
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Collaborations
--   C1: active collaboration between Mia and Acme (from app1)
--   C2: completed historical collaboration (for reviews)
-- -------------------------------------------------------------
insert into public.collaborations
  (id, campaign_id, application_id, creator_profile_id,
   business_profile_id, status, agreed_price, currency, terms,
   deliverables, deadline, submitted_at, completed_at)
values
  ('10101010-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000001',
   'eeeeeeee-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   '33333333-3333-4333-8333-333333333333',
   'active',
   900.00, 'USD',
   'One reel + two story frames, one revision round included,
payment on approval.',
   '[{"id":"20202020-0000-4000-8000-000000000001","title":"Instagram reel","due_date":"2026-12-05","status":"pending","asset_url":null},
     {"id":"20202020-0000-4000-8000-000000000002","title":"Two story frames","due_date":"2026-12-08","status":"pending","asset_url":null}]'::jsonb,
   now() + interval '7 days',
   null, null),
  ('10101010-0000-4000-8000-000000000002',
   null,
   null,
   '22222222-2222-4222-8222-222222222222',
   '33333333-3333-4333-8333-333333333333',
   'completed',
   400.00, 'USD',
   'Three workout reels delivered and approved.',
   '[{"id":"20202020-0000-4000-8000-000000000003","title":"Workout reel #1","due_date":null,"status":"approved","asset_url":null},
     {"id":"20202020-0000-4000-8000-000000000004","title":"Workout reel #2","due_date":null,"status":"approved","asset_url":null}]'::jsonb,
   null,
   now() - interval '40 days',
   now() - interval '30 days')
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Conversation + messages for C1 (one unread on each side)
-- -------------------------------------------------------------
insert into public.conversations
  (id, collaboration_id, created_by, created_at, updated_at)
values
  ('30303030-0000-4000-8000-000000000001',
   '10101010-0000-4000-8000-000000000001',
   '33333333-3333-4333-8333-333333333333',
   now() - interval '2 days',
   now() - interval '30 minutes')
on conflict (id) do nothing;

insert into public.messages
  (id, conversation_id, sender_profile_id, body, read_at, created_at)
values
  ('40404040-0000-4000-8000-000000000001',
   '30303030-0000-4000-8000-000000000001',
   '33333333-3333-4333-8333-333333333333',
   'Hi Mia! Excited to have you on the summer campaign. When can
you start shooting?',
   now() - interval '2 days', now() - interval '2 days'),
  ('40404040-0000-4000-8000-000000000002',
   '30303030-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'Thanks! I can shoot this weekend and send the first cut by
Tuesday.',
   now() - interval '2 days', now() - interval '46 hours'),
  ('40404040-0000-4000-8000-000000000003',
   '30303030-0000-4000-8000-000000000001',
   '33333333-3333-4333-8333-333333333333',
   'Perfect. I have dropped the brand kit and talking points in
the deliverables tab.',
   now() - interval '1 day', now() - interval '25 hours'),
  ('40404040-0000-4000-8000-000000000004',
   '30303030-0000-4000-8000-000000000001',
   '33333333-3333-4333-8333-333333333333',
   'Quick reminder: the reel deadline is in 7 days. Let me know
if you need anything!',
   null, now() - interval '1 hour'),
  ('40404040-0000-4000-8000-000000000005',
   '30303030-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'Got it — I will send the first cut by Tuesday.',
   null, now() - interval '30 minutes')
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Notifications (creator: one read, two unread; business: two unread)
-- -------------------------------------------------------------
insert into public.notifications
  (id, profile_id, type, title, body, link_path, read_at, created_at)
values
  ('50505050-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'application_status',
   'Your application was accepted',
   'Acme Drinks Co. accepted your application for Summer Fashion Reel Campaign.',
   '/creator/applications',
   now() - interval '1 day',
   now() - interval '1 day'),
  ('50505050-0000-4000-8000-000000000002',
   '11111111-1111-4111-8111-111111111111',
   'message',
   'New message from Acme Drinks Co.',
   'Quick reminder: the reel deadline is in 7 days.',
   '/creator/messages/30303030-0000-4000-8000-000000000001',
   null,
   now() - interval '1 hour'),
  ('50505050-0000-4000-8000-000000000003',
   '11111111-1111-4111-8111-111111111111',
   'deadline',
   'Deliverable due in 7 days',
   'Instagram reel for Summer Fashion Reel Campaign is due on 2026-12-05.',
   '/creator/collaborations',
   null,
   now() - interval '2 hours'),
   ('50505050-0000-4000-8000-000000000004',
    '33333333-3333-4333-8333-333333333333',
    'application_status',
    'New application received',
    'Rahul Verma applied to Summer Fashion Reel Campaign.',
    '/business/applications/eeeeeeee-0000-4000-8000-000000000002',
    null,
    now() - interval '3 hours'),
   ('50505050-0000-4000-8000-000000000005',
    '33333333-3333-4333-8333-333333333333',
    'message',
    'New message from Mia Chen',
    'Got it — I will send the first cut by Tuesday.',
    '/business/messages/30303030-0000-4000-8000-000000000001',
    null,
    now() - interval '30 minutes')
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Verification claims (separate statuses; nothing auto-verified)
-- -------------------------------------------------------------
insert into public.verifications
  (id, profile_id, type, status, social_account_id, method,
   review_notes, expires_at)
values
  ('60606060-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'phone', 'verified', null, 'sms_code',
   'OTP confirmed.', null),
  ('60606060-0000-4000-8000-000000000002',
   '11111111-1111-4111-8111-111111111111',
   'instagram_ownership', 'verified',
   'aaaaaaaa-0000-4000-8000-000000000001',
   'manual_review', 'Ownership confirmed via manual review.',
   now() + interval '6 months'),
  ('60606060-0000-4000-8000-000000000003',
   '11111111-1111-4111-8111-111111111111',
   'audience_quality', 'manual_review', null, 'manual_review',
   'Queued for analyst review.', null),
  ('60606060-0000-4000-8000-000000000004',
   '22222222-2222-4222-8222-222222222222',
   'instagram_ownership', 'pending',
   'aaaaaaaa-0000-4000-8000-000000000003',
   null, null, null)
on conflict (id) do nothing;

-- Keep social account verification flags in sync with approved claims
update public.social_accounts
set verification_status = 'verified',
    verification_method = 'manual_review',
    verified_at = now() - interval '20 days'
where id = 'aaaaaaaa-0000-4000-8000-000000000001';

update public.social_accounts
set verification_status = 'pending'
where id = 'aaaaaaaa-0000-4000-8000-000000000003';

-- -------------------------------------------------------------
-- Reviews on the completed collaboration
-- -------------------------------------------------------------
insert into public.reviews
  (id, collaboration_id, reviewer_profile_id, reviewee_profile_id,
   rating, comment, created_at, updated_at)
values
  ('70707070-0000-4000-8000-000000000001',
   '10101010-0000-4000-8000-000000000002',
   '22222222-2222-4222-8222-222222222222',
   '33333333-3333-4333-8333-333333333333',
   5,
   'Clear brief, on-time payments and genuinely friendly team.',
   now() - interval '29 days',
   now() - interval '29 days'),
  ('70707070-0000-4000-8000-000000000002',
   '10101010-0000-4000-8000-000000000002',
   '33333333-3333-4333-8333-333333333333',
   '22222222-2222-4222-8222-222222222222',
   5,
   'Delivered exactly what we agreed, ahead of schedule.',
   now() - interval '28 days',
   now() - interval '28 days')
on conflict (id) do nothing;
