-- Recover interrupted scheduled test processing.
-- Never automatically retry a claimed notification.
-- This function does not contact Expo or send notifications.

create function public.mark_stale_scheduled_tests_unconfirmed()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recovered_count integer;
begin
  update public.notification_campaigns
  set
    status = 'failed',
    last_error =
      'Delivery outcome unconfirmed. Do not retry automatically. ' ||
      'Scheduled test processing was interrupted or its result ' ||
      'could not be recorded.',
    updated_at = now()
  where status = 'sending'
    and audience = 'test'
    and scheduled_at is not null
    and started_at is not null
    and started_at < now() - interval '15 minutes';

  get diagnostics recovered_count = row_count;

  return recovered_count;
end;
$$;

-- Only trusted service-role callers may execute recovery.

revoke execute
on function public.mark_stale_scheduled_tests_unconfirmed()
from public, anon, authenticated;

grant execute
on function public.mark_stale_scheduled_tests_unconfirmed()
to service_role;
