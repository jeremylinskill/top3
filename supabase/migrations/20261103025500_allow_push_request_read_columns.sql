-- Development-only fix for Request a Top 3 push copy and unread badge lookup.
-- The webhook Edge Function uses ctx.supabaseAdmin (service_role), but
-- existing grants do not allow that role to SELECT from these tables.
-- Keep grants limited to the columns used by the push handler; no writes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Recover the linked request ID and calculate the recipient's visible unread badge.
GRANT SELECT (id, recipient_user_id, actor_user_id, type, top3_request_id, is_read)
  ON TABLE public.notifications TO service_role;

-- Resolve the requested category, destination and topic for personalized copy.
GRANT SELECT (id, recipient_user_id, category_id, destination_kind, topic_label)
  ON TABLE public.top3_requests TO service_role;

-- Exclude blocked actors from the recipient's unread badge, as the handler does.
GRANT SELECT (blocker_id, blocked_user_id)
  ON TABLE public.blocks TO service_role;

COMMIT;
