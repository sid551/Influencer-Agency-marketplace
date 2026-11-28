-- =============================================================
-- 20261128000001_niche_schema.sql
-- Relational niche data for personalised campaign recommendations.
--
--   niches           — canonical niche catalogue (mirrors NICHE_OPTIONS
--                      in src/types/creator.types.ts)
--   creator_niches   — creator ↔ niche, exactly one primary per creator
--   campaign_niches  — campaign ↔ target niche (at least one required)
--   related_niches   — undirected niche ↔ niche adjacency used by the
--                      +30 "related niche" score tier
--
-- Compatibility:
--   * creator_profiles.niches (text[]) is left in place and stays the
--     display column for existing UI; it is backfilled FROM (and kept
--     in sync WITH) creator_niches so nothing existing breaks.
--   * campaigns.category is untouched; campaign_niches is backfilled
--     from it where the category maps to a known niche.
--   * Every statement is idempotent (IF NOT EXISTS / ON CONFLICT).
-- =============================================================

-- -------------------------------------------------------------
-- niches — one row per selectable niche slug.
-- -------------------------------------------------------------
create table if not exists public.niches (
  slug        text primary key
              check (slug ~ '^[a-z][a-z0-9_]*$'),
  name        text not null
              check (char_length(name) between 1 and 80),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists niches_sort_idx
  on public.niches (sort_order, slug);

-- -------------------------------------------------------------
-- creator_niches — a creator's selected niches. The partial unique
-- index guarantees at most one primary niche per creator; the
-- application enforces "at least one primary" on write.
-- -------------------------------------------------------------
create table if not exists public.creator_niches (
  creator_profile_id  uuid not null
                      references public.creator_profiles (profile_id)
                      on delete cascade,
  niche_slug          text not null
                      references public.niches (slug)
                      on delete cascade,
  is_primary          boolean not null default false,
  created_at          timestamptz not null default now(),
  primary key (creator_profile_id, niche_slug)
);

create unique index if not exists creator_niches_one_primary_idx
  on public.creator_niches (creator_profile_id)
  where is_primary;

create index if not exists creator_niches_niche_idx
  on public.creator_niches (niche_slug);

-- -------------------------------------------------------------
-- campaign_niches — a campaign's target niches.
-- -------------------------------------------------------------
create table if not exists public.campaign_niches (
  campaign_id   uuid not null
                references public.campaigns (id)
                on delete cascade,
  niche_slug    text not null
                references public.niches (slug)
                on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (campaign_id, niche_slug)
);

create index if not exists campaign_niches_niche_idx
  on public.campaign_niches (niche_slug);

-- -------------------------------------------------------------
-- related_niches — symmetric adjacency (stored once per unordered
-- pair with niche_a < niche_b) powering the +30 related tier.
-- -------------------------------------------------------------
create table if not exists public.related_niches (
  niche_a       text not null
                references public.niches (slug)
                on delete cascade,
  niche_b       text not null
                references public.niches (slug)
                on delete cascade,
  primary key (niche_a, niche_b),
  check (niche_a < niche_b)
);

create index if not exists related_niches_b_idx
  on public.related_niches (niche_b);

-- -------------------------------------------------------------
-- Seed the catalogue. Slug list mirrors NICHE_OPTIONS exactly —
-- add new niches in BOTH this migration and creator.types.ts.
-- -------------------------------------------------------------
insert into public.niches (slug, name, sort_order) values
  ('fashion',       'Fashion', 10),
  ('beauty',        'Beauty', 20),
  ('lifestyle',     'Lifestyle', 30),
  ('fitness',       'Fitness', 40),
  ('wellness',      'Wellness', 50),
  ('food',          'Food', 60),
  ('travel',        'Travel', 70),
  ('tech',          'Tech', 80),
  ('gaming',        'Gaming', 90),
  ('music',         'Music', 100),
  ('dance',         'Dance', 110),
  ('education',     'Education', 120),
  ('business',      'Business', 130),
  ('finance',       'Finance', 140),
  ('parenting',     'Parenting', 150),
  ('home_decor',    'Home Decor', 160),
  ('comedy',        'Comedy', 170),
  ('photography',   'Photography', 180),
  ('sports',        'Sports', 190),
  ('automotive',    'Automotive', 200),
  ('art',           'Art', 210),
  ('sustainability','Sustainability', 220),
  ('other',         'Other', 230)
on conflict (slug) do nothing;

-- -------------------------------------------------------------
-- Related-niche adjacency. Curated, deterministic, and safe to
-- extend later — no behavioural data involved.
-- -------------------------------------------------------------
insert into public.related_niches (niche_a, niche_b) values
  ('fitness',    'wellness'),
  ('fitness',    'sports'),
  ('sports',     'wellness'),
  ('food',       'wellness'),
  ('beauty',     'fashion'),
  ('fashion',    'lifestyle'),
  ('beauty',     'lifestyle'),
  ('lifestyle',  'travel'),
  ('lifestyle',  'parenting'),
  ('gaming',     'tech'),
  ('business',   'tech'),
  ('business',   'finance'),
  ('comedy',     'music'),
  ('dance',      'music'),
  ('art',        'photography'),
  ('art',        'home_decor'),
  ('education',  'tech')
on conflict do nothing;

-- -------------------------------------------------------------
-- Backfill creator_niches from the legacy text[] column.
-- The first array element becomes the primary niche; the rest are
-- secondary. Idempotent: existing rows are never touched.
-- -------------------------------------------------------------
insert into public.creator_niches (creator_profile_id, niche_slug, is_primary)
select cp.profile_id,
       n.slug,
       (n.ord = 1) as is_primary
from public.creator_profiles cp
cross join lateral unnest(cp.niches) with ordinality as n(slug, ord)
join public.niches ns on ns.slug = n.slug
on conflict (creator_profile_id, niche_slug) do nothing;

-- -------------------------------------------------------------
-- Backfill campaign_niches from the free-text category where it
-- maps cleanly onto a known niche slug.
-- -------------------------------------------------------------
insert into public.campaign_niches (campaign_id, niche_slug)
select c.id, ns.slug
from public.campaigns c
join public.niches ns
  on ns.slug = regexp_replace(lower(trim(c.category)), '[^a-z0-9]+', '_', 'g')
on conflict do nothing;

-- -------------------------------------------------------------
-- Row Level Security — default DENY, matching migration 0003.
-- Writes to creator_niches / campaign_niches happen through the
-- validated service layer under the caller's own session, so the
-- policies below mirror the ownership rules used everywhere else.
-- -------------------------------------------------------------
alter table public.niches enable row level security;
alter table public.creator_niches enable row level security;
alter table public.campaign_niches enable row level security;
alter table public.related_niches enable row level security;

-- niches / related_niches are read-only reference data.
drop policy if exists niches_select on public.niches;
create policy niches_select on public.niches
  for select to authenticated
  using (true);

drop policy if exists related_niches_select on public.related_niches;
create policy related_niches_select on public.related_niches
  for select to authenticated
  using (true);

-- creator_niches: owners manage their own; the directory view keeps
-- exposing the legacy text[] so nothing else needs read access.
drop policy if exists creator_niches_select on public.creator_niches;
create policy creator_niches_select on public.creator_niches
  for select to authenticated
  using (
    creator_profile_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists creator_niches_insert on public.creator_niches;
create policy creator_niches_insert on public.creator_niches
  for insert to authenticated
  with check (creator_profile_id = auth.uid());

drop policy if exists creator_niches_update on public.creator_niches;
create policy creator_niches_update on public.creator_niches
  for update to authenticated
  using (creator_profile_id = auth.uid())
  with check (creator_profile_id = auth.uid());

drop policy if exists creator_niches_delete on public.creator_niches;
create policy creator_niches_delete on public.creator_niches
  for delete to authenticated
  using (creator_profile_id = auth.uid());

-- campaign_niches: readable by anyone who can see the campaign,
-- writable only by the owning business.
drop policy if exists campaign_niches_select on public.campaign_niches;
create policy campaign_niches_select on public.campaign_niches
  for select to authenticated
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = campaign_niches.campaign_id
        and (
          c.status in ('published', 'active')
          or c.business_profile_id = auth.uid()
          or public.is_admin()
        )
    )
  );

drop policy if exists campaign_niches_write on public.campaign_niches;
create policy campaign_niches_write on public.campaign_niches
  for all to authenticated
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = campaign_niches.campaign_id
        and c.business_profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.campaigns c
      where c.id = campaign_niches.campaign_id
        and c.business_profile_id = auth.uid()
    )
  );
