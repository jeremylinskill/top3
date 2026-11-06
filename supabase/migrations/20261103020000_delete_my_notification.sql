-- Development-first: recipient-only notification deletion and atomic Top 3 request dismissal.
-- Execute ONLY on the confirmed Development project after reviewing the guarded app installer.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $preflight$
BEGIN
  IF to_regclass('public.notifications') IS NULL OR to_regclass('public.top3_requests') IS NULL THEN
    RAISE EXCEPTION 'STOP: expected notifications and top3_requests tables';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications'
      AND column_name='top3_request_id'
  ) THEN
    RAISE EXCEPTION 'STOP: notifications.top3_request_id is absent';
  END IF;
  IF to_regprocedure('public.delete_my_notification(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: delete_my_notification already exists; review before changing';
  END IF;
END;
$preflight$;

CREATE FUNCTION public.delete_my_notification(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  request_id uuid;
  notification_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock only the recipient's notification. No broader table DELETE grant.
  SELECT type, top3_request_id INTO notification_type, request_id
    FROM public.notifications
    WHERE id = p_notification_id AND recipient_user_id = auth.uid()
    FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Dismiss the underlying request only while it is pending.
  -- A completed request is left completed; the notification can still be deleted.
  IF notification_type = 'top3_request' AND request_id IS NOT NULL THEN
    UPDATE public.top3_requests
      SET status = 'dismissed', updated_at = now()
      WHERE id = request_id AND recipient_user_id = auth.uid() AND status = 'pending';
  END IF;

  DELETE FROM public.notifications
    WHERE id = p_notification_id AND recipient_user_id = auth.uid();
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_my_notification(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_notification(uuid) TO authenticated;
COMMENT ON FUNCTION public.delete_my_notification(uuid) IS
  'Authenticated recipient deletes only their notification; pending linked Top 3 requests are dismissed in the same transaction.';
COMMIT;
