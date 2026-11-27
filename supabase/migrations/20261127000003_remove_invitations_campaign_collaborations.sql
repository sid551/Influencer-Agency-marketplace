-- =============================================================
-- Remove direct creator invitations and move collaboration startup
-- to accepted campaign applications.
--
-- Historical migrations are left untouched. This migration drops
-- collaboration_requests and triggers that reference it, backfills
-- collaborations/conversations for already-accepted applications, and
-- installs a trigger on campaign_applications.status -> accepted.
-- All helpers are SECURITY DEFINER with a fixed search_path so they work
-- under the end user's RLS-scoped session.
-- =============================================================

-- Drop triggers/functions that only existed for invitation records.
drop trigger if exists collaboration_requests_create_collaboration on public.collaboration_requests;
drop trigger if exists collaboration_requests_notify on public.collaboration_requests;
drop trigger if exists collaboration_requests_notify_business_response on public.collaboration_requests;

drop function if exists public.create_collaboration_from_request();
drop function if exists public.notify_collaboration_request();
drop function if exists public.notify_business_invitation_response();

-- The table is the last invitation artifact; RLS policies and indexes go
-- with it. Notification *history* of the old type is intentionally kept.
drop table if exists public.collaboration_requests;

-- -------------------------------------------------------------
-- Create/open one collaboration and its conversation for an accepted
-- application. Idempotent: an existing collaboration is reused, and an
-- existing conversation is reused by the unique collaboration_id index.
-- -------------------------------------------------------------
create or replace function public.create_collaboration_from_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id        uuid;
  v_collaboration_id   uuid;
  v_existing_collab_id uuid;
begin
  -- Applications can be accepted directly or after shortlisting; only
  -- skip unchanged updates and non-accepted statuses.
  if old.status is not distinct from new.status or new.status <> 'accepted' then
    return new;
  end if;

  select c.business_profile_id
    into v_business_id
    from public.campaigns c
   where c.id = new.campaign_id;

  if not found or v_business_id is null then
    return new;
  end if;

  select c.id
    into v_existing_collab_id
    from public.collaborations c
   where c.application_id = new.id
   limit 1;

  if v_existing_collab_id is not null then
    v_collaboration_id := v_existing_collab_id;
  else
    insert into public.collaborations (
      campaign_id,
      application_id,
      creator_profile_id,
      business_profile_id,
      status,
      currency,
      terms,
      deliverables
    ) values (
      new.campaign_id,
      new.id,
      new.creator_profile_id,
      v_business_id,
      'negotiating',
      coalesce(new.currency, 'INR'),
      null,
      '[]'::jsonb
    )
    returning id into v_collaboration_id;
  end if;

  insert into public.conversations (collaboration_id, created_by)
  values (v_collaboration_id, new.creator_profile_id)
  on conflict (collaboration_id) do nothing;

  return new;
end;
$$;

drop trigger if exists campaign_applications_create_collaboration on public.campaign_applications;
create trigger campaign_applications_create_collaboration
  after update of status on public.campaign_applications
  for each row execute function public.create_collaboration_from_application();

-- Backfill accepted applications that predate this trigger. Seed data and
-- older production rows get the same collaboration/conversation shape. The
-- function reads NEW/OLD implicitly, so run the same logic in a DO block.
do $$
declare
  rec record;
  v_business_id        uuid;
  v_collaboration_id   uuid;
  v_existing_collab_id uuid;
begin
  for rec in
    select ca.id, ca.campaign_id, ca.creator_profile_id, ca.currency
      from public.campaign_applications ca
     where ca.status = 'accepted'
     order by ca.created_at
  loop
    select c.business_profile_id
      into v_business_id
      from public.campaigns c
     where c.id = rec.campaign_id;

    if not found or v_business_id is null then
      continue;
    end if;

    select c.id
      into v_existing_collab_id
      from public.collaborations c
     where c.application_id = rec.id
     limit 1;

    if v_existing_collab_id is not null then
      v_collaboration_id := v_existing_collab_id;
    else
      insert into public.collaborations (
        campaign_id,
        application_id,
        creator_profile_id,
        business_profile_id,
        status,
        currency,
        terms,
        deliverables
      ) values (
        rec.campaign_id,
        rec.id,
        rec.creator_profile_id,
        v_business_id,
        'negotiating',
        coalesce(rec.currency, 'INR'),
        null,
        '[]'::jsonb
      )
      returning id into v_collaboration_id;
    end if;

    insert into public.conversations (collaboration_id, created_by)
    values (v_collaboration_id, rec.creator_profile_id)
    on conflict (collaboration_id) do nothing;
  end loop;
end;
$$;
