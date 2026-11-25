-- =============================================================
-- Phase 9 — security hardening.
--
-- Corrections to policies introduced in earlier migrations. Written as a
-- new migration rather than editing history so existing projects receive
-- the fixes when they run `supabase db push`.
--
-- Threat model: the publishable key is public, so PostgREST/RPC calls
-- made directly with it must obey the same rules as the Server Actions.
-- =============================================================

-- -------------------------------------------------------------
-- 1. create_notification is only for database triggers.
--    It runs as SECURITY DEFINER, so leaving PUBLIC EXECUTE in place
--    lets any browser client forge notifications for any profile.
--    Trigger functions run as their definer and keep working.
-- -------------------------------------------------------------
revoke all on function public.create_notification(uuid, text, text, text, text)
  from public, anon, authenticated;

-- -------------------------------------------------------------
-- 2. Notifications are derived data. Remove the blanket INSERT
--    policy: only admins may write directly, everything else comes
--    from the trigger helper above.
-- -------------------------------------------------------------
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (public.is_admin() and read_at is null);

-- -------------------------------------------------------------
-- 3. Verification claims may only reference the caller's own
--    social account and an evidence file inside their own folder.
--    The service already checks both; RLS enforces it for direct
--    PostgREST calls too.
-- -------------------------------------------------------------
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
    and (
      social_account_id is null
      or exists (
        select 1
        from public.social_accounts sa
        where sa.id = social_account_id
          and sa.profile_id = auth.uid()
      )
    )
    and (
      evidence_path is null
      or evidence_path ~ (
        '^' || auth.uid()::text || '/[0-9a-f-]{36}\.(png|jpg|pdf)$'
      )
    )
  );

-- -------------------------------------------------------------
-- 4. Storage INSERT already pins objects to the owner's folder,
--    but UPDATE/DELETE did not. Close the gap so a renamed object
--    cannot be moved into another user's folder.
-- -------------------------------------------------------------
drop policy if exists "public_media_update" on storage.objects;
create policy "public_media_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'portfolio')
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'portfolio')
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "public_media_delete" on storage.objects;
create policy "public_media_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'portfolio')
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "verification_docs_update" on storage.objects;
create policy "verification_docs_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'verification-docs'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'verification-docs'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "verification_docs_delete" on storage.objects;
create policy "verification_docs_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -------------------------------------------------------------
-- 5. Collaboration timestamps and review notes are workflow-owned.
--    Participants may still change status (checked by the transition
--    trigger) and negotiate terms/deliverables, but cannot backdate
--    submission/completion or inject review notes via direct PATCH.
--    The trigger below records the milestones server-side.
-- -------------------------------------------------------------
create or replace function public.set_collaboration_milestones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'submitted'
     and old.status is distinct from new.status
     and new.submitted_at is null then
    new.submitted_at := now();
  end if;

  if new.status = 'completed'
     and old.status is distinct from new.status
     and new.completed_at is null then
    new.completed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists collaborations_set_milestones on public.collaborations;
create trigger collaborations_set_milestones
  before update on public.collaborations
  for each row execute function public.set_collaboration_milestones();

revoke update on public.collaborations from authenticated;
grant update (status, agreed_price, currency, terms, deliverables, deadline)
  on public.collaborations to authenticated;
