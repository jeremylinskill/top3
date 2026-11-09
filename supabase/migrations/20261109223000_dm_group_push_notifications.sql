-- Top 3 Development-only Group DM invitation and message push events.
-- The existing authenticated send-push-notification Edge Function is reused.
-- Only opaque UUIDs are sent from PostgreSQL; no message text, collection
-- title, group name, token, profile or roster is included in webhooks.
-- Production must never run this migration in its current form.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF to_regclass('public.dm_group_messages') IS NULL
     OR to_regclass('public.dm_group_members') IS NULL
     OR to_regprocedure('public.dm_group_send_message(uuid,text)') IS NULL
     OR to_regprocedure('public.dm_group_invite(uuid,uuid)') IS NULL
     OR to_regprocedure('public.dm_send_push_notification_webhook()') IS NULL
     OR to_regclass('vault.decrypted_secrets') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'net' AND p.proname = 'http_post') THEN
    RAISE EXCEPTION 'STOP: group messaging or existing DM push prerequisites missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'project_url'
      AND rtrim(decrypted_secret, '/') = 'https://kkltzygebomopysklaqq.supabase.co'
  ) THEN
    RAISE EXCEPTION 'STOP: this Group DM push migration is Development-only';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets
                 WHERE name = 'push_notification_webhook' AND decrypted_secret IS NOT NULL) THEN
    RAISE EXCEPTION 'STOP: existing authenticated push webhook secret missing';
  END IF;
  IF to_regprocedure('public.dm_group_send_push_message_webhook()') IS NOT NULL
     OR to_regprocedure('public.dm_group_send_push_invitation_webhook()') IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE (tgrelid = 'public.dm_group_messages'::regclass
              AND tgname = 'dm_group_send_push_message')
          OR (tgrelid = 'public.dm_group_members'::regclass
              AND tgname = 'dm_group_send_push_invitation')
     ) THEN
    RAISE EXCEPTION 'STOP: group push objects already present; inspect before applying';
  END IF;
END;
$guard$;

CREATE FUNCTION public.dm_group_send_push_message_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  project_url text;
  webhook_key text;
BEGIN
  SELECT decrypted_secret INTO project_url FROM vault.decrypted_secrets
  WHERE name = 'project_url' LIMIT 1;
  IF rtrim(COALESCE(project_url, ''), '/') <> 'https://kkltzygebomopysklaqq.supabase.co' THEN
    RAISE WARNING 'Group message push skipped: not Development';
    RETURN NEW;
  END IF;
  SELECT decrypted_secret INTO webhook_key FROM vault.decrypted_secrets
  WHERE name = 'push_notification_webhook' LIMIT 1;
  IF webhook_key IS NULL THEN
    RAISE WARNING 'Group message push skipped: webhook credential unavailable';
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type','application/json','apikey',webhook_key),
    body := jsonb_build_object('type','INSERT','table','dm_group_messages',
      'schema','public','record',jsonb_build_object('id',NEW.id),'old_record',NULL),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Group message push enqueue failed: %', SQLERRM;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.dm_group_send_push_message_webhook()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER dm_group_send_push_message
AFTER INSERT ON public.dm_group_messages
FOR EACH ROW EXECUTE FUNCTION public.dm_group_send_push_message_webhook();

CREATE FUNCTION public.dm_group_send_push_invitation_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  project_url text;
  webhook_key text;
BEGIN
  IF NEW.status <> 'invited' THEN RETURN NEW; END IF;
  SELECT decrypted_secret INTO project_url FROM vault.decrypted_secrets
  WHERE name = 'project_url' LIMIT 1;
  IF rtrim(COALESCE(project_url, ''), '/') <> 'https://kkltzygebomopysklaqq.supabase.co' THEN
    RAISE WARNING 'Group invitation push skipped: not Development';
    RETURN NEW;
  END IF;
  SELECT decrypted_secret INTO webhook_key FROM vault.decrypted_secrets
  WHERE name = 'push_notification_webhook' LIMIT 1;
  IF webhook_key IS NULL THEN
    RAISE WARNING 'Group invitation push skipped: webhook credential unavailable';
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type','application/json','apikey',webhook_key),
    body := jsonb_build_object('type','INSERT','table','dm_group_members',
      'schema','public',
      'record',jsonb_build_object('group_id',NEW.group_id,'user_id',NEW.user_id),
      'old_record',NULL),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Group invitation push enqueue failed: %', SQLERRM;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.dm_group_send_push_invitation_webhook()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER dm_group_send_push_invitation
AFTER INSERT ON public.dm_group_members
FOR EACH ROW WHEN (NEW.status = 'invited')
EXECUTE FUNCTION public.dm_group_send_push_invitation_webhook();

COMMIT;
