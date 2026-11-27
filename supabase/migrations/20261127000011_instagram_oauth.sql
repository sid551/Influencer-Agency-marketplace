-- =============================================================
-- Instagram Business Login (Hypee-style creator onboarding).
--
-- Verification columns on social_accounts are intentionally NOT
-- owner-writable (see 0003 column grants). OAuth ownership is written by
-- the SECURITY DEFINER functions below, which are the only code paths
-- allowed to mark an Instagram account verified. Access tokens are stored
-- as AES-256-GCM ciphertext produced by the app server; no plaintext token
-- or decryption key ever reaches Postgres or the browser.
-- =============================================================

create table if not exists public.instagram_connections (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null unique
                      references public.profiles (id) on delete cascade,
  social_account_id uuid
                      references public.social_accounts (id) on delete set null,
  ig_user_id        text not null
                      check (char_length(ig_user_id) between 1 and 255),
  token_ciphertext  text not null,
  token_iv          text not null,
  token_tag         text not null,
  token_expires_at  timestamptz,
  scopes            text[] not null default '{}',
  status            text not null default 'connected'
                      check (status in ('connected', 'expired', 'revoked',
                                        'disconnected')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists instagram_connections_updated_at
  on public.instagram_connections;
create trigger instagram_connections_updated_at
  before update on public.instagram_connections
  for each row execute function public.set_updated_at();

alter table public.instagram_connections enable row level security;

-- No policies and no table grants: only the SECURITY DEFINER RPCs below may
-- read or write this table. Direct PostgREST calls are denied outright.
revoke all on public.instagram_connections from anon, authenticated;

-- -------------------------------------------------------------
-- Upsert the verified Instagram account + encrypted connection.
-- -------------------------------------------------------------
create or replace function public.connect_instagram_account(
  p_profile_id       uuid,
  p_username         text,
  p_platform_user_id text,
  p_follower_count   bigint,
  p_token_ciphertext text,
  p_token_iv         text,
  p_token_tag        text,
  p_token_expires_at timestamptz,
  p_scopes           text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_profile_id then
    raise exception 'Not authorized to connect this Instagram account'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
     where p.id = p_profile_id and p.role = 'creator'
  ) then
    raise exception 'Only creators can connect Instagram'
      using errcode = '42501';
  end if;

  if p_username is null
     or char_length(p_username) not between 1 and 100
     or p_username !~ '^[A-Za-z0-9._-]+$'
     or p_platform_user_id is null
     or char_length(p_platform_user_id) not between 1 and 255
     or coalesce(p_follower_count, -1) < 0
     or p_token_ciphertext is null
     or p_token_iv is null
     or p_token_tag is null then
    raise exception 'Invalid Instagram connection payload'
      using errcode = '22023';
  end if;

  -- Prefer an existing row for this handle, then one for this Instagram ID.
  select sa.id into v_account_id
    from public.social_accounts sa
   where sa.profile_id = p_profile_id
     and sa.platform = 'instagram'
     and sa.username = p_username
   order by (sa.verification_status = 'verified') desc
   limit 1;

  if v_account_id is null then
    select sa.id into v_account_id
      from public.social_accounts sa
     where sa.profile_id = p_profile_id
       and sa.platform = 'instagram'
       and sa.platform_user_id = p_platform_user_id
     limit 1;
  end if;

  if v_account_id is null then
    insert into public.social_accounts (
      profile_id, platform, username, platform_user_id, follower_count,
      verification_status, verification_method, verified_at
    ) values (
      p_profile_id, 'instagram', p_username, p_platform_user_id,
      p_follower_count, 'verified', 'oauth', now()
    )
    returning id into v_account_id;
  else
    -- Merge duplicates of the same account (e.g. a self-reported row with
    -- the handle and another with the platform ID) before updating.
    delete from public.social_accounts sa
     where sa.profile_id = p_profile_id
       and sa.platform = 'instagram'
       and sa.id <> v_account_id
       and (sa.username = p_username
            or sa.platform_user_id = p_platform_user_id);

    update public.social_accounts sa
       set username            = p_username,
           platform_user_id    = p_platform_user_id,
           follower_count      = p_follower_count,
           verification_status = 'verified',
           verification_method = 'oauth',
           verified_at         = now()
     where sa.id = v_account_id;
  end if;

  insert into public.instagram_connections (
    profile_id, social_account_id, ig_user_id, token_ciphertext, token_iv,
    token_tag, token_expires_at, scopes, status
  ) values (
    p_profile_id, v_account_id, p_platform_user_id, p_token_ciphertext,
    p_token_iv, p_token_tag, p_token_expires_at, coalesce(p_scopes, '{}'),
    'connected'
  )
  on conflict (profile_id) do update set
    social_account_id = excluded.social_account_id,
    ig_user_id        = excluded.ig_user_id,
    token_ciphertext  = excluded.token_ciphertext,
    token_iv          = excluded.token_iv,
    token_tag         = excluded.token_tag,
    token_expires_at  = excluded.token_expires_at,
    scopes            = excluded.scopes,
    status            = 'connected';

  return v_account_id;
end;
$$;

revoke all on function public.connect_instagram_account(
  uuid, text, text, bigint, text, text, text, timestamptz, text[]
) from public, anon, authenticated;
grant execute on function public.connect_instagram_account(
  uuid, text, text, bigint, text, text, text, timestamptz, text[]
) to authenticated;

-- -------------------------------------------------------------
-- Disconnect: delete the encrypted token and the verified account rows.
-- -------------------------------------------------------------
create or replace function public.disconnect_instagram_account(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
  v_ig_user_id text;
begin
  if auth.uid() is null or auth.uid() <> p_profile_id then
    raise exception 'Not authorized to disconnect this Instagram account'
      using errcode = '42501';
  end if;

  select ic.social_account_id, ic.ig_user_id
    into v_account_id, v_ig_user_id
    from public.instagram_connections ic
   where ic.profile_id = p_profile_id;

  if v_ig_user_id is null then
    return false;
  end if;

  delete from public.instagram_connections ic
   where ic.profile_id = p_profile_id;

  if v_account_id is not null then
    delete from public.social_accounts sa
     where sa.id = v_account_id and sa.profile_id = p_profile_id;
  else
    delete from public.social_accounts sa
     where sa.profile_id = p_profile_id
       and sa.platform = 'instagram'
       and sa.platform_user_id = v_ig_user_id;
  end if;

  return true;
end;
$$;

revoke all on function public.disconnect_instagram_account(uuid)
  from public, anon, authenticated;
grant execute on function public.disconnect_instagram_account(uuid)
  to authenticated;
