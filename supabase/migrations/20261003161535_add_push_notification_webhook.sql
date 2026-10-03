CREATE OR REPLACE FUNCTION public.send_push_notification_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  project_url text;
  webhook_key text;
BEGIN
  SELECT decrypted_secret
  INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  SELECT decrypted_secret
  INTO webhook_key
  FROM vault.decrypted_secrets
  WHERE name = 'push_notification_webhook'
  LIMIT 1;

  IF project_url IS NULL OR webhook_key IS NULL THEN
    RAISE WARNING
      'Push notification webhook skipped because required Vault secrets are missing.';

    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := rtrim(project_url, '/') ||
      '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', webhook_key
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', NULL
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING
      'Push notification webhook enqueue failed: %',
      SQLERRM;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS send_push_notification
ON public.notifications;

CREATE TRIGGER send_push_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_push_notification_webhook();
