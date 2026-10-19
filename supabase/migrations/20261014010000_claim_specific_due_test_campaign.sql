-- Claim only one explicitly selected scheduled test campaign.
-- Used for controlled delivery testing.
-- Does not send notifications or process other campaigns.

create function public.claim_specific_due_test_campaign(
  p_campaign_id uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  update public.notification_campaigns as nc
  set
    status = 'sending',
    started_at = now(),
    target_count = 1,
    updated_at = now()
  where nc.id = p_campaign_id
    and nc.status = 'scheduled'
    and nc.audience = 'test'
    and nc.scheduled_at > now() - interval '5 minutes'
    and nc.scheduled_at <= now()
    and nc.created_by is not null
    and nc.target_push_token_id is not null
    and exists (
      select 1
      from public.profiles as p
      where p.id = nc.created_by
        and p.is_admin = true
    )
    and exists (
      select 1
      from public.push_tokens as t
      where t.id = nc.target_push_token_id
        and t.user_id = nc.created_by
    )
  returning nc.id;
$$;

revoke execute
on function public.claim_specific_due_test_campaign(uuid)
from public, anon, authenticated;

grant execute
on function public.claim_specific_due_test_campaign(uuid)
to service_role;
