-- Atomically claim one due test notification.
-- This function does not send notifications.
-- Automatic execution remains disabled.

create function public.claim_due_test_notification_campaign()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed_campaign_id uuid;
begin
  -- Mark unsendable due tests as failed before claiming work.
  -- No Expo request has been made for these campaigns.
  update public.notification_campaigns as nc
  set
    status = 'failed',
    target_count = 0,
    accepted_count = 0,
    failed_count = 0,
    last_error = case
      when nc.scheduled_at <= now() - interval '5 minutes'
        then 'Scheduled test expired before delivery. No notification was sent.'
      when nc.created_by is null
        or not exists (
          select 1
          from public.profiles as profile
          where profile.id = nc.created_by
            and profile.is_admin = true
        )
        then 'Administrator access is no longer valid. No notification was sent.'
      else
        'Registered test device is no longer available. No notification was sent.'
    end,
    updated_at = now()
  where nc.status = 'scheduled'
    and nc.audience = 'test'
    and nc.scheduled_at <= now()
    and (
      nc.scheduled_at <= now() - interval '5 minutes'
      or nc.created_by is null
      or not exists (
        select 1
        from public.profiles as profile
        where profile.id = nc.created_by
          and profile.is_admin = true
      )
      or nc.target_push_token_id is null
      or not exists (
        select 1
        from public.push_tokens as token
        where token.id = nc.target_push_token_id
          and token.user_id = nc.created_by
      )
    );

  -- Claim only due, valid, administrator-owned test campaigns.
  with next_campaign as (
    select id
    from public.notification_campaigns as nc
    where nc.status = 'scheduled'
      and nc.audience = 'test'
      -- Do not deliver a stale notification after worker downtime.
      and nc.scheduled_at > now() - interval '5 minutes'
      and nc.scheduled_at <= now()
      -- Never substitute another device if the original is missing.
      and nc.target_push_token_id is not null
      and nc.created_by is not null
      and exists (
        select 1
        from public.profiles as profile
        where profile.id = nc.created_by
          and profile.is_admin = true
      )
      and exists (
        select 1
        from public.push_tokens as token
        where token.id = nc.target_push_token_id
          and token.user_id = nc.created_by
      )
    order by nc.scheduled_at asc, nc.id asc
    for update of nc skip locked
    limit 1
  )
  update public.notification_campaigns as campaign
  set
    status = 'sending',
    started_at = now(),
    target_count = 1,
    updated_at = now()
  from next_campaign
  where campaign.id = next_campaign.id
    and campaign.status = 'scheduled'
    and campaign.audience = 'test'
  returning campaign.id into claimed_campaign_id;

  return claimed_campaign_id;
end;
$$;

-- PostgreSQL grants function execution to PUBLIC by default.
-- Restrict this operation to trusted service-role callers.

revoke execute
on function public.claim_due_test_notification_campaign()
from public, anon, authenticated;

grant execute
on function public.claim_due_test_notification_campaign()
to service_role;
