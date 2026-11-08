-- Development-only Direct Message pushes using the existing trusted
-- send-push-notification Edge Function. No DM message bodies are sent to the
-- webhook, and no duplicate social notification row is created.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF to_regclass('public.dm_messages') IS NULL
     OR to_regclass('public.dm_conversations') IS NULL
     OR to_regclass('public.notifications') IS NULL
     OR to_regprocedure('public.send_push_notification_webhook()') IS NULL
     OR to_regclass('vault.secrets') IS NULL THEN
    RAISE EXCEPTION 'STOP: Expected DM and push infrastructure missing';
  END IF;
  IF to_regprocedure('public.dm_send_push_notification_webhook()') IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'public.dm_messages'::regclass
         AND tgname = 'dm_send_push_notification'
     ) THEN
    RAISE EXCEPTION 'STOP: DM push webhook already exists; inspect before deploying';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.notifications'::regclass
      AND tgname = 'send_push_notification' AND tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'STOP: Existing social push trigger missing or inactive';
  END IF;
END;
$guard$;

CREATE FUNCTION public.dm_send_push_notification_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  project_url text;
  webhook_key text;
BEGIN
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  SELECT decrypted_secret INTO webhook_key
  FROM vault.decrypted_secrets
  WHERE name = 'push_notification_webhook'
  LIMIT 1;

  IF project_url IS NULL OR webhook_key IS NULL THEN
    RAISE WARNING 'DM push skipped: required Vault secrets missing';
    RETURN NEW;
  END IF;

  -- A Development migration must never send private-message events to an
  -- accidental Production or other project URL in Vault.
  IF rtrim(project_url, '/') <> 'https://kkltzygebomopysklaqq.supabase.co' THEN
    RAISE WARNING 'DM push skipped: Vault project_url is not Development';
    RETURN NEW;
  END IF;

  -- Reuse the existing authenticated Edge Function, without including the
  -- message body, sender, or recipient in this asynchronous HTTP event.
  PERFORM net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', webhook_key
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'dm_messages',
      'schema', 'public',
      'record', jsonb_build_object('id', NEW.id),
      'old_record', NULL
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'DM push webhook enqueue failed: %', SQLERRM;
    RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_send_push_notification_webhook()
  FROM PUBLIC, anon, authenticated;

-- INSERT-only: one event for each new message, never for read-state updates,
-- moderation removal, or conversation refreshes.
CREATE TRIGGER dm_send_push_notification
AFTER INSERT ON public.dm_messages
FOR EACH ROW
EXECUTE FUNCTION public.dm_send_push_notification_webhook();

COMMIT;
