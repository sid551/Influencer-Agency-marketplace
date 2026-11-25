-- =============================================================
-- 0004_storage_buckets.sql
-- Storage buckets and object policies.
--
--   avatars           — public profile pictures
--   portfolio         — public portfolio media
--   verification-docs — PRIVATE: identity documents and other
--                       sensitive verification evidence
--
-- Object paths are namespaced per user: <auth.uid()/filename>.
-- Users can only write inside their own folder.
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('portfolio', 'portfolio', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('verification-docs', 'verification-docs', false, 10485760,
   array['image/png', 'image/jpeg', 'application/pdf'])
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Public buckets: anyone may read; only the owner may write,
-- and only inside their own folder.
-- -------------------------------------------------------------
drop policy if exists "public_media_read" on storage.objects;
create policy "public_media_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('avatars', 'portfolio'));

drop policy if exists "public_media_insert" on storage.objects;
create policy "public_media_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'portfolio')
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "public_media_update" on storage.objects;
create policy "public_media_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'portfolio')
    and owner = auth.uid()
  )
  with check (
    bucket_id in ('avatars', 'portfolio')
    and owner = auth.uid()
  );

drop policy if exists "public_media_delete" on storage.objects;
create policy "public_media_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'portfolio')
    and owner = auth.uid()
  );

-- -------------------------------------------------------------
-- verification-docs: private. Readable by the owner and admins
-- only; never exposed publicly.
-- -------------------------------------------------------------
drop policy if exists "verification_docs_insert" on storage.objects;
create policy "verification_docs_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "verification_docs_select" on storage.objects;
create policy "verification_docs_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (owner = auth.uid() or public.is_admin())
  );

drop policy if exists "verification_docs_update" on storage.objects;
create policy "verification_docs_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'verification-docs' and owner = auth.uid())
  with check (bucket_id = 'verification-docs' and owner = auth.uid());

drop policy if exists "verification_docs_delete" on storage.objects;
create policy "verification_docs_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verification-docs' and owner = auth.uid());
