-- =============================================================
-- rls_assertions.sql — Phase 2 security verification + Phase 9 hardening
--
-- Runs inside a single transaction that is rolled back at the
-- end, so the database is left untouched.
--
-- Usage (local Supabase stack):
--   docker exec -i supabase_db_<project> psql -U postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/rls_assertions.sql
--
-- Any failed assertion raises an exception and aborts the run.
-- =============================================================

\set ON_ERROR_STOP on

begin;

-- -------------------------------------------------------------
-- A. Schema sanity: RLS enabled on all 15 tables
-- -------------------------------------------------------------
do $$
declare v_count int;
begin
  select count(*) into v_count
  from pg_tables
  where schemaname = 'public'
    and tablename in ('profiles','creator_profiles','business_profiles',
                      'social_accounts','portfolio_items','creator_services',
                      'campaigns','campaign_applications',
                      'collaborations',
                      'conversations','messages','verifications',
                      'notifications','reviews')
    and rowsecurity = true;

  if v_count <> 14 then
    raise exception 'FAIL: RLS enabled on % of 14 tables', v_count;
  end if;
  raise notice 'PASS: RLS enabled on all 14 tables';
end $$;

-- -------------------------------------------------------------
-- B. Seed data present (counts must match seed.sql)
-- -------------------------------------------------------------
do $$
declare
  v_expected jsonb := '{"profiles":3,"creator_profiles":2,
    "business_profiles":1,"social_accounts":3,"portfolio_items":3,
    "creator_services":3,"campaigns":3,"campaign_applications":3,
    "collaborations":2,"conversations":1,
    "messages":5,"notifications":5,"verifications":4,"reviews":2}'::jsonb;
  v_pair record;
  v_count int;
begin
  for v_pair in select * from jsonb_each_text(v_expected) loop
    execute format('select count(*) from public.%I', v_pair.key) into v_count;
    if v_count <> v_pair.value::int then
      raise exception 'FAIL: table % has % rows, expected %',
        v_pair.key, v_count, v_pair.value;
    end if;
  end loop;
  raise notice 'PASS: seed row counts match';
end $$;

-- -------------------------------------------------------------
-- C. As creator1 (signed in)
-- -------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

-- C1. Only published/active campaigns are visible
do $$
declare v_count int;
begin
  select count(*) into v_count from public.campaigns;
  if v_count <> 2 then
    raise exception 'FAIL: creator sees % campaigns, expected 2 (draft hidden)', v_count;
  end if;
  raise notice 'PASS: draft campaigns hidden from creators';
end $$;

-- C2. profiles: own row only; other creators'' emails invisible
do $$
declare v_count int; v_email text;
begin
  select count(*) into v_count from public.profiles;
  if v_count <> 1 then
    raise exception 'FAIL: creator sees % profile rows, expected 1', v_count;
  end if;
  select email into v_email from public.profiles;
  if v_email is distinct from 'mia@example.com' then
    raise exception 'FAIL: creator cannot read own email (got %)', v_email;
  end if;
  raise notice 'PASS: profiles scoped to owner (email readable by owner only)';
end $$;

-- C3. creator_profiles: own row only; creator_directory view public
do $$
declare v_count int;
begin
  select count(*) into v_count from public.creator_profiles;
  if v_count <> 1 then
    raise exception 'FAIL: creator sees % creator_profiles rows, expected 1', v_count;
  end if;
  select count(*) into v_count from public.creator_directory;
  if v_count <> 2 then
    raise exception 'FAIL: creator_directory returns % rows, expected 2', v_count;
  end if;
  raise notice 'PASS: creator_profiles private, creator_directory public';
end $$;

-- C4. Applications/collaborations/messages/notifications/verifications
--      scoped to the current user
do $$
declare v_count int;
begin
  select count(*) into v_count from public.campaign_applications;
  if v_count <> 1 then raise exception 'FAIL: applications = %', v_count; end if;

  select count(*) into v_count from public.collaborations;
  if v_count <> 1 then raise exception 'FAIL: collaborations = %', v_count; end if;

  select count(*) into v_count from public.messages;
  if v_count <> 5 then raise exception 'FAIL: messages = %', v_count; end if;

  select count(*) into v_count from public.notifications;
  if v_count <> 3 then raise exception 'FAIL: notifications = %', v_count; end if;

  select count(*) into v_count from public.verifications;
  if v_count <> 3 then raise exception 'FAIL: verifications = %', v_count; end if;

  raise notice 'PASS: private data scoped to participant';
end $$;

-- C5. Column grants: role escalation must fail
do $$
begin
  update public.profiles set role = 'admin'
    where id = '11111111-1111-4111-8111-111111111111';
  raise exception 'FAIL: creator was able to change own role to admin';
exception when insufficient_privilege then
  raise notice 'PASS: role column immutable for users';
end $$;

-- C6. Column grants: verification status must fail
do $$
begin
  update public.social_accounts
     set verification_status = 'verified', verified_at = now()
   where id = 'aaaaaaaa-0000-4000-8000-000000000003';
  raise exception 'FAIL: creator was able to set verification_status';
exception when insufficient_privilege then
  raise notice 'PASS: verification columns immutable for users';
end $$;

-- C7. Cannot insert an application for another creator
do $$
begin
  insert into public.campaign_applications
    (campaign_id, creator_profile_id, proposal, expected_price, status)
  values
    ('dddddddd-0000-4000-8000-000000000001',
     '22222222-2222-4222-8222-222222222222',
     'impersonation attempt', 1.00, 'pending');
  raise exception 'FAIL: application inserted for another creator';
exception when insufficient_privilege then
  raise notice 'PASS: cannot apply as another creator';
end $$;

-- C8. Cannot insert a non-pending application
do $$
begin
  insert into public.campaign_applications
    (campaign_id, creator_profile_id, proposal, expected_price, status)
  values
    ('dddddddd-0000-4000-8000-000000000002',
     '11111111-1111-4111-8111-111111111111',
     'status spoof attempt', 1.00, 'accepted');
  raise exception 'FAIL: application inserted with status=accepted';
exception when insufficient_privilege then
  raise notice 'PASS: applications always start as pending';
end $$;

-- C9. Cannot withdraw someone else''s application (row invisible)
do $$
declare v_rows int;
begin
  update public.campaign_applications
     set status = 'withdrawn'
   where id = 'eeeeeeee-0000-4000-8000-000000000003';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FAIL: updated another creator''s application (% rows)', v_rows;
  end if;
  raise notice 'PASS: other creators'' applications untouched';
end $$;

-- C10. Transition trigger: creator cannot change a non-pending status
do $$
begin
  update public.campaign_applications
     set status = 'withdrawn'
   where id = 'eeeeeeee-0000-4000-8000-000000000001';
  raise exception 'FAIL: creator changed an accepted application';
exception when raise_exception then
  if sqlerrm not like 'Creators may only withdraw%' then
    raise;
  end if;
  raise notice 'PASS: application transitions enforced for creators';
end $$;

-- C11. Cannot send a message as someone else
do $$
begin
  insert into public.messages
    (conversation_id, sender_profile_id, body)
  values
    ('30303030-0000-4000-8000-000000000001',
     '33333333-3333-4333-8333-333333333333',
     'impersonation attempt');
  raise exception 'FAIL: message sent as another user';
exception when insufficient_privilege then
  raise notice 'PASS: messages can only be sent as yourself';
end $$;

-- C12. Message bodies are immutable (only read_at is updatable)
do $$
begin
  update public.messages
     set body = 'tampered'
   where id = '40404040-0000-4000-8000-000000000001';
  raise exception 'FAIL: message body was editable';
exception when insufficient_privilege then
  raise notice 'PASS: message bodies immutable';
end $$;

-- C13. Marking someone else''s message as read is impossible
do $$
declare v_rows int;
begin
  update public.messages
     set read_at = now()
   where id = '40404040-0000-4000-8000-000000000004'
     and sender_profile_id <> '11111111-1111-4111-8111-111111111111';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FAIL: recipient could not set read_at (% rows)', v_rows;
  end if;
  raise notice 'PASS: recipient can mark messages read';
end $$;

-- C14. Own verification claims can only be created as pending
do $$
begin
  insert into public.verifications (profile_id, type, status)
  values ('11111111-1111-4111-8111-111111111111', 'identity', 'verified');
  raise exception 'FAIL: verification inserted with status=verified';
exception when insufficient_privilege then
  raise notice 'PASS: verification claims always start pending';
end $$;

-- C15. Owners cannot review their own claims (admin-only update
--      policy filters the row out, so 0 rows may change)
do $$
declare v_rows int;
begin
  update public.verifications
     set status = 'verified', method = 'manual_review'
   where id = '60606060-0000-4000-8000-000000000003';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FAIL: owner updated a verification claim (% rows)', v_rows;
  end if;
  raise notice 'PASS: verification review is admin-only';
end $$;

-- C16. Campaigns are not writable by creators
do $$
declare v_rows int;
begin
  update public.campaigns set status = 'closed'
   where id = 'dddddddd-0000-4000-8000-000000000001';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FAIL: creator updated a campaign (% rows)', v_rows;
  end if;
  raise notice 'PASS: campaigns read-only for creators';
end $$;

-- C17. Notifications cannot be created for oneself
do $$
begin
  insert into public.notifications (profile_id, type, title)
  values ('11111111-1111-4111-8111-111111111111', 'system', 'self note');
  raise exception 'FAIL: self-notification inserted';
exception when insufficient_privilege then
  raise notice 'PASS: notifications cannot target yourself';
end $$;

-- C18. The notification helper is trigger-only, not RPC-callable
do $$
begin
  perform public.create_notification(
    '11111111-1111-4111-8111-111111111111',
    'system', 'spoofed', null, null);
  raise exception 'FAIL: caller could invoke create_notification directly';
exception when insufficient_privilege then
  raise notice 'PASS: create_notification is not callable via RPC';
end $$;

-- C19. Direct notification inserts are no longer open to creators
do $$
begin
  insert into public.notifications (profile_id, type, title)
  values ('22222222-2222-4222-8222-222222222222', 'system', 'spoofed');
  raise exception 'FAIL: creator inserted a notification for another profile';
exception when insufficient_privilege then
  raise notice 'PASS: direct notification inserts are blocked';
end $$;

-- C20. A claim cannot attach another creator's social account
do $$
begin
  insert into public.verifications (profile_id, type, status, social_account_id)
  values ('11111111-1111-4111-8111-111111111111', 'youtube_ownership',
          'pending', 'aaaaaaaa-0000-4000-8000-000000000003');
  raise exception 'FAIL: claim attached someone else''s social account';
exception when insufficient_privilege then
  raise notice 'PASS: verification claims require account ownership';
end $$;

-- C21. A claim cannot point at evidence in another user's folder
do $$
begin
  insert into public.verifications (profile_id, type, status, evidence_path)
  values ('11111111-1111-4111-8111-111111111111', 'identity',
          'pending', '22222222-2222-4222-8222-222222222222/evidence.png');
  raise exception 'FAIL: claim used another user''s evidence folder';
exception when insufficient_privilege then
  raise notice 'PASS: evidence paths are scoped to the claim owner';
end $$;

-- C22. Workflow timestamps are trigger-owned
do $$
begin
  update public.collaborations
     set submitted_at = now()
   where id = '10101010-0000-4000-8000-000000000001';
  raise exception 'FAIL: creator wrote a workflow timestamp';
exception when insufficient_privilege then
  raise notice 'PASS: workflow timestamps are not client-writable';
end $$;

-- -------------------------------------------------------------
-- D. As business owner (signed in)
-- -------------------------------------------------------------
set local request.jwt.claims =
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';

-- D1. Own drafts visible, applications on own campaigns visible
do $$
declare v_count int;
begin
  select count(*) into v_count from public.campaigns;
  if v_count <> 3 then
    raise exception 'FAIL: business sees % campaigns, expected 3', v_count;
  end if;
  select count(*) into v_count from public.campaign_applications;
  if v_count <> 3 then
    raise exception 'FAIL: business sees % applications, expected 3', v_count;
  end if;
  raise notice 'PASS: business sees own campaigns and their applications';
end $$;

-- D1b. Business inbox: notifications and unread messages are scoped to it
do $$
declare v_count int;
begin
  select count(*) into v_count from public.notifications;
  if v_count <> 2 then
    raise exception 'FAIL: business sees % notifications, expected 2', v_count;
  end if;

  select count(*) into v_count from public.messages
   where read_at is null
     and sender_profile_id <> '33333333-3333-4333-8333-333333333333';
  if v_count <> 1 then
    raise exception 'FAIL: business unread messages = %, expected 1', v_count;
  end if;
  raise notice 'PASS: business notifications and unread messages are scoped';
end $$;

-- D2. Business may accept a pending application
do $$
declare v_status text;
begin
  update public.campaign_applications
     set status = 'accepted'
   where id = 'eeeeeeee-0000-4000-8000-000000000002';
  select status into v_status
    from public.campaign_applications
   where id = 'eeeeeeee-0000-4000-8000-000000000002';
  if v_status <> 'accepted' then
    raise exception 'FAIL: business could not accept (status %)', v_status;
  end if;
  raise notice 'PASS: business can progress application statuses';
end $$;

-- D3. Invalid transition blocked (accepted -> completed)
do $$
begin
  update public.campaign_applications
     set status = 'completed'
   where id = 'eeeeeeee-0000-4000-8000-000000000001';
  raise exception 'FAIL: invalid application transition allowed';
exception when raise_exception then
  if sqlerrm not like 'Invalid application status transition%' then
    raise;
  end if;
  raise notice 'PASS: invalid application transitions rejected';
end $$;

-- -------------------------------------------------------------
-- E. As anonymous visitor
-- -------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

-- E1. Public display data readable
do $$
declare v_count int;
begin
  select count(*) into v_count from public.creator_directory;
  if v_count <> 2 then
    raise exception 'FAIL: anon creator_directory = %', v_count;
  end if;
  select count(*) into v_count from public.social_accounts;
  if v_count <> 3 then
    raise exception 'FAIL: anon social_accounts = %', v_count;
  end if;
  raise notice 'PASS: public data readable anonymously';
end $$;

-- E2. Private tables are not even readable
do $$
begin
  perform count(*) from public.messages;
  raise exception 'FAIL: anon can read messages';
exception when insufficient_privilege then
  raise notice 'PASS: anon denied on private tables';
end $$;

do $$
begin
  perform count(*) from public.campaigns;
  raise exception 'FAIL: anon can read campaigns';
exception when insufficient_privilege then
  raise notice 'PASS: anon denied on campaigns';
end $$;

do $$
begin
  perform count(*) from public.profiles;
  raise exception 'FAIL: anon can read profiles';
exception when insufficient_privilege then
  raise notice 'PASS: anon denied on profiles';
end $$;

-- E3. Private storage bucket is not exposed
do $$
declare v_count int;
begin
  select count(*) into v_count
    from storage.objects where bucket_id = 'verification-docs';
  if v_count <> 0 then
    raise exception 'FAIL: anon sees % verification docs', v_count;
  end if;
  raise notice 'PASS: verification-docs bucket not exposed';
end $$;

-- -------------------------------------------------------------
-- Done — roll everything back
-- -------------------------------------------------------------
reset role;
rollback;

select 'ALL RLS ASSERTIONS PASSED' as result;
