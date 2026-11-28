-- =============================================================
-- Human-friendly campaign URLs.
--
-- The UUID primary key stays as the internal identifier. A stable,
-- URL-safe slug is added for links, so public campaign pages no longer
-- expose 36-character UUIDs. Existing rows get a deterministic slug.
-- =============================================================

alter table public.campaigns add column if not exists slug text;

-- Backfill from the title plus a short piece of the UUID. The UUID fragment
-- guarantees uniqueness for existing campaigns even when titles match.
update public.campaigns
   set slug =
     left(
       trim(both '-' from lower(regexp_replace(
         coalesce(nullif(btrim(title), ''), 'campaign'),
         '[^a-z0-9]+', '-', 'g'
       ))),
       40
     )
     || '-' || substr(replace(id::text, '-', ''), 1, 8)
 where slug is null;

alter table public.campaigns alter column slug set not null;

create unique index if not exists campaigns_slug_key on public.campaigns (slug);

-- New campaigns get a readable slug automatically. Slugs are intentionally
-- stable when a title changes so existing links keep working.
create or replace function public.set_campaign_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base text;
  v_slug text;
  i integer;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;

  v_base := left(
    trim(both '-' from lower(regexp_replace(
      coalesce(nullif(btrim(new.title), ''), 'campaign'),
      '[^a-z0-9]+', '-', 'g'
    ))),
    40
  );
  if v_base = '' then
    v_base := 'campaign';
  end if;

  for i in 1..10 loop
    v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    exit when not exists (select 1 from public.campaigns where slug = v_slug);
  end loop;

  new.slug := v_slug;
  return new;
end;
$$;

drop trigger if exists campaigns_set_slug on public.campaigns;
create trigger campaigns_set_slug
  before insert on public.campaigns
  for each row execute function public.set_campaign_slug();

comment on column public.campaigns.slug is
  'Stable URL-safe public reference for campaign pages; the UUID id remains internal.';
