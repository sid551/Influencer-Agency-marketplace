-- =============================================================
-- 20261128000002_recommend_campaigns_rpc.sql
-- Deterministic niche-based campaign recommendation feed.
--
-- recommend_creator_campaigns(section, limit, offset)
--   * identifies the caller via auth.uid() (SECURITY INVOKER, so the
--     existing campaigns RLS policy applies unchanged),
--   * only returns eligible campaigns: status published/active and
--     no passed application deadline (mirrors the campaign_applications
--     insert policy),
--   * scores each campaign against the caller's niches using tiers
--     (best tier wins — points are never summed across niches),
--   * groups results into 'recommended' | 'related' | 'explore',
--   * paginates with limit/offset and reports total_count per call,
--   * returns each campaign exactly once (niches aggregated, no join
--     fan-out).
--
-- Scoring tiers (mirrored in src/lib/recommendation.ts for tests):
--   100  campaign targets the creator's primary niche
--    60  campaign targets one of the creator's secondary niches
--    30  campaign targets a niche related to any creator niche
--    10  no niche relationship (still discoverable)
-- =============================================================

create or replace function public.recommend_creator_campaigns(
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

-- Only signed-in creators may call it. Postgres grants EXECUTE to
-- PUBLIC by default, so revoke that before granting narrowly.
revoke execute on function public.recommend_creator_campaigns(text, integer, integer)
  from public, anon;
grant execute on function public.recommend_creator_campaigns(text, integer, integer)
  to authenticated;
