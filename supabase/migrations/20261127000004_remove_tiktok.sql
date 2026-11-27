-- Remove TikTok from stored data and platform constraints. Historical
-- migrations are intentionally untouched; all fixes are additive.

-- social_accounts.platform CHECK in the initial schema includes 'tiktok'.
-- Drop every CHECK on this column, clean stored rows, then re-add one.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
     where ns.nspname = 'public'
       and rel.relname = 'social_accounts'
       and con.contype = 'c'
       and con.conkey = array[
             (select attnum from pg_attribute
               where attrelid = rel.oid and attname = 'platform')
           ]::smallint[]
  loop
    execute format('alter table public.social_accounts drop constraint %I', constraint_name);
  end loop;
end;
$$;

-- Legacy TikTok accounts cannot satisfy the new constraint; remove them
-- first so the migration applies on existing projects.
delete from public.verifications
 where social_account_id in (
   select id from public.social_accounts where platform = 'tiktok'
 );
delete from public.social_accounts where platform = 'tiktok';

alter table public.social_accounts
  add constraint social_accounts_platform_check
  check (platform in ('instagram', 'youtube', 'facebook', 'x', 'linkedin', 'other'));

-- campaigns.platforms is a text[] with an inline array-level CHECK that
-- includes 'tiktok'. Drop it by name from the catalogue, clean stored
-- arrays, then re-add the curated constraint.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
     where ns.nspname = 'public'
       and rel.relname = 'campaigns'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%tiktok%'
  loop
    execute format('alter table public.campaigns drop constraint %I', constraint_name);
  end loop;
end;
$$;

update public.campaigns
   set platforms = array_remove(platforms, 'tiktok')
 where platforms @> array['tiktok'];

alter table public.campaigns
  add constraint campaigns_platforms_check
  check (
    cardinality(platforms) > 0
    and platforms <@ array['instagram', 'youtube', 'facebook', 'x', 'linkedin', 'other']::text[]
  );
