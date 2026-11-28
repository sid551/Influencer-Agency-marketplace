-- =============================================================
-- 20261128000003_campaign_images.sql
-- Cloudinary-backed campaign photos.
--
-- The image bytes live only in Cloudinary. Supabase stores the returned
-- https://res.cloudinary.com/<cloud>/image/upload/... URL, the full public_id
-- (needed for replacement/removal), and an optional alt description.
--
-- One photo per campaign is intentional: the schema stays simple and the
-- existing campaign forms/cards keep their current layout. Multiple photos
-- would need a separate campaign_images table.
-- =============================================================

-- The recommendation function's return type changes below, so PostgreSQL
-- requires a drop rather than CREATE OR REPLACE. It is recreated in full.
drop function if exists public.recommend_creator_campaigns(text, integer, integer);

alter table public.campaigns
  add column if not exists image_url text,
  add column if not exists image_public_id text,
  add column if not exists image_alt text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_image_url_check'
  ) then
    alter table public.campaigns
      add constraint campaigns_image_url_check
      check (
        image_url is null
        or image_url ~ '^https://res\.cloudinary\.com/[^/]+/image/upload/[^?]+$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_image_public_id_check'
  ) then
    alter table public.campaigns
      add constraint campaigns_image_public_id_check
      check (
        image_public_id is null
        or (char_length(image_public_id) between 1 and 255
            and image_public_id ~ '^[A-Za-z0-9_./-]+$')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_image_alt_check'
  ) then
    alter table public.campaigns
      add constraint campaigns_image_alt_check
      check (image_alt is null or char_length(image_alt) <= 150);
  end if;
end $$;

comment on column public.campaigns.image_url is
  'Cloudinary secure_url for the campaign photo (no query string).';
comment on column public.campaigns.image_public_id is
  'Full Cloudinary public_id, used to replace or remove the asset.';
comment on column public.campaigns.image_alt is
  'Optional accessible description of the campaign photo.';

create function public.recommend_creator_campaigns(
  p_section text default null,
  p_limit   integer default 12,
  p_offset  integer default 0
)
returns table (
  id                   uuid,
  business_profile_id  uuid,
  title                text,
  description          text,
  category             text,
  platforms            text[],
  collaboration_type   text,
  budget_min           numeric,
  budget_max           numeric,
  currency             text,
  deliverables         text[],
  application_deadline timestamptz,
  location             text,
  status               text,
  image_url            text,
  image_public_id      text,
  image_alt            text,
  created_at           timestamptz,
  updated_at           timestamptz,
  target_niches        text[],
  match_score          integer,
  match_section        text,
  total_count          bigint
)
language sql
stable
set search_path = ''
as $$
  with my_niches as (
    select
      coalesce(max(cn.niche_slug) filter (where cn.is_primary), '')
        as primary_slug,
      coalesce(array_agg(cn.niche_slug) filter (where not cn.is_primary), '{}')
        as secondary_slugs,
      coalesce(array_agg(cn.niche_slug), '{}') as all_slugs
    from public.creator_niches cn
    where cn.creator_profile_id = auth.uid()
  ),
  eligible as (
    select
      c.id,
      c.business_profile_id,
      c.title,
      c.description,
      c.category,
      c.platforms,
      c.collaboration_type,
      c.budget_min,
      c.budget_max,
      c.currency,
      c.deliverables,
      c.application_deadline,
      c.location,
      c.status,
      c.image_url,
      c.image_public_id,
      c.image_alt,
      c.created_at,
      c.updated_at,
      coalesce(t.niches, '{}') as target_niches
    from public.campaigns c
    left join lateral (
      select array_agg(cn.niche_slug order by cn.niche_slug) as niches
      from public.campaign_niches cn
      where cn.campaign_id = c.id
    ) t on true
    where c.status in ('published', 'active')
      and (c.application_deadline is null or c.application_deadline > now())
  ),
  scored as (
    select
      e.*,
      case
        when (select primary_slug from my_niches) <> ''
             and e.target_niches && array[(select primary_slug from my_niches)]
          then 100
        when e.target_niches && (select secondary_slugs from my_niches)
          then 60
        when exists (
          select 1
          from unnest(e.target_niches) as tgt(slug)
          cross join my_niches m
          join public.related_niches rn
            on (rn.niche_a = tgt.slug and rn.niche_b = any (m.all_slugs))
            or (rn.niche_b = tgt.slug and rn.niche_a = any (m.all_slugs))
        )
          then 30
        else 10
      end as match_score
    from eligible e
  ),
  sectioned as (
    select
      s.*,
      case
        when s.match_score >= 60 then 'recommended'
        when s.match_score = 30  then 'related'
        else 'explore'
      end as match_section
    from scored s
  )
  select
    sec.id,
    sec.business_profile_id,
    sec.title,
    sec.description,
    sec.category,
    sec.platforms,
    sec.collaboration_type,
    sec.budget_min,
    sec.budget_max,
    sec.currency,
    sec.deliverables,
    sec.application_deadline,
    sec.location,
    sec.status,
    sec.image_url,
    sec.image_public_id,
    sec.image_alt,
    sec.created_at,
    sec.updated_at,
    sec.target_niches,
    sec.match_score,
    sec.match_section,
    count(*) over () as total_count
  from sectioned sec
  where p_section is null or sec.match_section = p_section
  order by sec.match_score desc, sec.created_at desc, sec.id desc
  limit greatest(coalesce(p_limit, 12), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

-- Postgres grants EXECUTE to PUBLIC by default; keep the RPC creator-only.
revoke execute on function public.recommend_creator_campaigns(text, integer, integer)
  from public, anon;
grant execute on function public.recommend_creator_campaigns(text, integer, integer)
  to authenticated;
