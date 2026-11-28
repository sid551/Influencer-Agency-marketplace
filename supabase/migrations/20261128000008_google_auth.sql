-- =============================================================
-- Google Sign-In support.
--
-- Supabase OAuth creates the auth user and runs handle_new_user().
-- OAuth sign-in cannot carry app metadata, so the app stores the chosen
-- role in a short-lived cookie and this RPC applies it only to profiles
-- created during that sign-in attempt. Existing users keep their role.
-- =============================================================

-- Google provides a display name and avatar in provider metadata. Keep the
-- same creator-first default as email signup, but use what the provider gave us.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := case
    when new.raw_user_meta_data ->> 'role' = 'business' then 'business'
    else 'creator'
  end;
  v_username text := nullif(coalesce(new.raw_user_meta_data ->> 'username', ''), '');
  v_full_name text := nullif(
    btrim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )),
    ''
  );
  v_avatar_url text := nullif(
    btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')),
    ''
  );
begin
  if v_username is not null and v_username !~ '^[A-Za-z0-9_]{3,30}$' then
    v_username := null;
  end if;

  insert into public.profiles (id, role, email, full_name, username, avatar_url)
  values (
    new.id,
    v_role,
    new.email,
    v_full_name,
    v_username,
    v_avatar_url
  )
  on conflict (id) do nothing;

  if v_role = 'creator' then
    insert into public.creator_profiles (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

-- Apply the role selected on the Google signup form, but only for a profile
-- created at (or just before) the start of that OAuth attempt. This prevents
-- an old account from changing role through a replayed/edited cookie.
create or replace function public.apply_google_signup_role(
  p_role text,
  p_started_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_role not in ('creator', 'business') or p_started_at is null then
    return false;
  end if;

  -- 'creator' is the trigger default, so no write is needed.
  if p_role = 'creator' then
    return true;
  end if;

  update public.profiles
     set role = p_role,
         updated_at = now()
   where id = auth.uid()
     and role = 'creator'
     and created_at >= p_started_at - interval '1 minute'
     and created_at <= now() + interval '1 minute';

  if not found then
    return false;
  end if;

  -- handle_new_user() creates the creator onboarding row by default.
  -- Business onboarding creates business_profiles when company details are submitted.
  delete from public.creator_profiles where profile_id = auth.uid();

  return true;
end;
$$;

comment on function public.apply_google_signup_role(text, timestamptz) is
  'Applies the role chosen during a fresh Google sign-in; existing roles are never changed.';

revoke all on function public.apply_google_signup_role(text, timestamptz) from public, anon;
grant execute on function public.apply_google_signup_role(text, timestamptz) to authenticated;
