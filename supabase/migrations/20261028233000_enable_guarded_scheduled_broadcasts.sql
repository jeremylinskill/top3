-- Scheduled broadcasts: database foundations only. No cron job or send is enabled here.
-- Existing scheduled TEST claims and worker remain unchanged.

alter table public.notification_campaigns
  drop constraint notification_campaigns_scheduled_test_only_check;

-- The all-user audience has no fixed test-device target. Existing tests retain
-- their exact device-target semantics and stay under their existing worker.
alter table public.notification_campaigns
  add constraint notification_campaigns_scheduled_audience_check
  check (
    status <> 'scheduled'
    or audience = 'test'
    or (audience = 'all' and target_push_token_id is null)
  );

-- Claim at most one due all-user campaign, atomically, excluding test campaigns.
-- This function ONLY updates database status. It never sends push notifications.
create function public.claim_due_broadcast_notification_campaign()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed uuid;
begin
  -- Expired/unauthorized scheduled broadcasts are failed, never delivered late.
  update public.notification_campaigns as nc
  set status = 'failed',
      last_error = 'Scheduled broadcast expired or administrator access was revoked. No message was sent.',
      updated_at = now()
  where nc.audience = 'all'
    and nc.status = 'scheduled'
    and nc.scheduled_at <= now()
    and (
      nc.scheduled_at <= now() - interval '5 minutes'
      or nc.created_by is null
      or not exists (
        select 1 from public.profiles as p
        where p.id = nc.created_by and p.is_admin = true
      )
    );

  with next_campaign as (
    select nc.id
    from public.notification_campaigns as nc
    where nc.audience = 'all'
      and nc.status = 'scheduled'
      and nc.scheduled_at <= now()
      and nc.scheduled_at > now() - interval '5 minutes'
      and nc.target_push_token_id is null
      and nc.created_by is not null
      and exists (
        select 1 from public.profiles as p
        where p.id = nc.created_by and p.is_admin = true
      )
    order by nc.scheduled_at, nc.id
    for update of nc skip locked
    limit 1
  )
  update public.notification_campaigns as campaign
    set status = 'sending',
        started_at = now(),
        accepted_count = 0,
        failed_count = 0,
        target_count = 0,
        updated_at = now()
  from next_campaign
  where campaign.id = next_campaign.id
    and campaign.audience = 'all'
    and campaign.status = 'scheduled'
  returning campaign.id into claimed;

  return claimed;
end;
$$;

-- Claim exactly one explicitly selected campaign during QA; never choose
-- another notification. It must already be due and administered by an admin.
create function public.claim_specific_due_broadcast_campaign(p_campaign_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare claimed uuid;
begin
  update public.notification_campaigns as nc
  set status = 'sending',
      started_at = now(),
      accepted_count = 0,
      failed_count = 0,
      target_count = 0,
      updated_at = now()
  where nc.id = p_campaign_id
    and nc.audience = 'all'
    and nc.status = 'scheduled'
    and nc.scheduled_at <= now()
    and nc.scheduled_at > now() - interval '5 minutes'
    and nc.target_push_token_id is null
    and nc.created_by is not null
    and exists (
      select 1 from public.profiles as p
      where p.id = nc.created_by and p.is_admin = true
    )
  returning nc.id into claimed;
  return claimed;
end;
$$;

-- No retries on indeterminate sent attempts: mark interrupted sends as failed
-- with a clear uncertainty warning. An operator must investigate first.
create function public.mark_stale_scheduled_broadcasts_unconfirmed()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare recovered integer;
begin
  update public.notification_campaigns
  set status = 'failed',
      last_error = 'Broadcast delivery outcome unconfirmed after interruption. Do not retry automatically.',
      updated_at = now()
  where audience = 'all'
    and status = 'sending'
    and scheduled_at is not null
    and started_at < now() - interval '15 minutes';

  get diagnostics recovered = row_count;
  return recovered;
end;
$$;

revoke execute on function public.claim_due_broadcast_notification_campaign()
  from public, anon, authenticated;
grant execute on function public.claim_due_broadcast_notification_campaign()
  to service_role;

revoke execute on function public.mark_stale_scheduled_broadcasts_unconfirmed()
  from public, anon, authenticated;
grant execute on function public.mark_stale_scheduled_broadcasts_unconfirmed()
  to service_role;

revoke execute on function public.claim_specific_due_broadcast_campaign(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_specific_due_broadcast_campaign(uuid)
  to service_role;
