-- =============================================================
-- Finish short campaign URLs.
--
-- Correct the slug regex (lowercase before stripping non-alphanumerics),
-- refresh existing slugs, and make the creator feed plus notification
-- links use the readable reference instead of the UUID.
-- =============================================================

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

  -- Lowercase first so capital letters are kept as URL-safe words.
  v_base := left(
    trim(both '-' from regexp_replace(
      lower(coalesce(nullif(btrim(new.title), ''), 'campaign')),
      '[^a-z0-9]+', '-', 'g'
    )),
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

-- Refresh rows written by the first slug migration.
update public.campaigns
   set slug =
     left(
       trim(both '-' from regexp_replace(
         lower(coalesce(nullif(btrim(title), ''), 'campaign')),
         '[^a-z0-9]+', '-', 'g'
       )),
       40
     )
     || '-' || substr(replace(id::text, '-', ''), 1, 8);

-- Discovery cards need the slug to build short detail links. The return
-- type changed, so Postgres requires a drop before recreating the function.
drop function if exists public.recommend_creator_campaigns(text, integer, integer);
create function public.recommend_creator_campaigns(
  p_section text default null,
  p_limit   integer default 12,
  p_offset  integer default 0
)
returns table (
  id                   uuid,
  slug                 text,
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
      c.slug,
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
    sec.slug,
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

revoke execute on function public.recommend_creator_campaigns(text, integer, integer)
  from public, anon;
grant execute on function public.recommend_creator_campaigns(text, integer, integer)
  to authenticated;

-- Notification links should point at the same short URL as the UI.
create or replace function public.notify_business_new_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_campaign text;
  v_slug     text;
  v_creator  text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select c.business_profile_id, c.title, c.slug
    into v_business, v_campaign, v_slug
    from public.campaigns c
   where c.id = new.campaign_id;

  if not found or auth.uid() = v_business then
    return new;
  end if;

  select coalesce(p.full_name, p.username, 'A creator')
    into v_creator
    from public.profiles p
   where p.id = new.creator_profile_id;

  perform public.create_notification(
    v_business,
    'application_status',
    'New application received',
    coalesce(v_creator, 'A creator') || ' applied to '
      || coalesce(v_campaign, 'your campaign') || '.',
    '/business/campaigns/' || coalesce(v_slug, new.campaign_id::text) || '/applications'
  );

  return new;
end;
$$;

update public.notifications n
   set link_path = '/business/campaigns/' || c.slug || '/applications'
  from public.campaign_applications ca
  join public.campaigns c on c.id = ca.campaign_id
 where n.type = 'application_status'
   and n.link_path in (
     '/business/campaigns/' || ca.campaign_id::text || '/applications',
     '/business/applications/' || ca.id::text
   );
