-- Verification is now embedded in the creator profile, so review-status
-- notifications must deep-link to that section instead of the old route.

create or replace function public.notify_verification_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_title := case new.status
    when 'verified' then 'Verification approved'
    when 'rejected' then 'Verification rejected'
    when 'expired' then 'Verification expired'
    when 'revoked' then 'Verification revoked'
    else 'Verification update'
  end;

  perform public.create_notification(
    new.profile_id,
    'system',
    v_title,
    coalesce(new.review_notes,
             'Your verification status changed to ' || new.status || '.'),
    '/creator/profile#verification'
  );

  return new;
end;
$$;

-- Existing notifications keep pointing at the retired route until this runs.
update public.notifications
set link_path = '/creator/profile#verification'
where link_path = '/creator/verification';
