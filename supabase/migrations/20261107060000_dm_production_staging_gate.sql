-- Top 3 v1.2.0: shared follow-up migration after the six historical DM
-- migrations. Preserve Development messaging; stage Production OFF.
-- No Production DM network calls, RPC access, or direct reads before launch.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $stage$
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RAISE EXCEPTION 'STOP: Supabase Vault decrypted view missing';
  END IF;

  -- This branch is intentionally a no-op for the already-running Development
  -- environment. Its original DM webhook and grants stay as-is.
  IF EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'project_url'
      AND rtrim(decrypted_secret, '/') = 'https://kkltzygebomopysklaqq.supabase.co'
  ) THEN
    IF to_regprocedure('public.dm_send_push_notification_webhook()') IS NULL THEN
      RAISE EXCEPTION 'STOP: Development DM webhook unexpectedly missing';
    END IF;
    RAISE NOTICE 'Verified Top 3 Development: no Production gating changes';
    RETURN;
  END IF;

  IF to_regclass('public.dm_conversations') IS NULL
     OR to_regclass('public.dm_messages') IS NULL
     OR to_regclass('public.dm_read_states') IS NULL
     OR to_regprocedure('public.dm_send_push_notification_webhook()') IS NULL
     OR to_regprocedure('public.dm_create_conversation(uuid)') IS NULL
     OR to_regprocedure('public.dm_send_message(uuid,text)') IS NULL
     OR to_regprocedure('public.dm_mark_read(uuid,uuid)') IS NULL
     OR to_regprocedure('public.dm_share_collection(uuid,uuid)') IS NULL
     OR to_regprocedure('public.dm_list_share_recipients()') IS NULL
     OR to_regclass('public.dm_release_control') IS NOT NULL
     OR to_regclass('public.notifications') IS NULL
     OR to_regclass('vault.secrets') IS NULL
     OR EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url')
     OR NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_notification_webhook')
     OR NOT EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'net' AND p.proname = 'http_post'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger t
       JOIN pg_proc p ON p.oid = t.tgfoid
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE t.tgrelid = 'public.notifications'::regclass
         AND t.tgname = 'send_push_notification'
         AND t.tgenabled = 'O'
         AND n.nspname = 'supabase_functions'
         AND p.proname = 'http_request'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_description d
       JOIN pg_proc p ON p.oid = d.objoid
       WHERE p.oid = to_regprocedure('public.send_push_notification_webhook()')
         AND d.description = 'top3_dm_v120_temporary_push_compatibility_bridge'
     ) THEN
    RAISE EXCEPTION 'STOP: Unknown Production staging prerequisites; manual review required';
  END IF;

  -- Database-only release switch. Clients (including older app versions)
  -- cannot enable this by changing Expo flags.
  CREATE TABLE public.dm_release_control (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    enabled boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  INSERT INTO public.dm_release_control (singleton, enabled) VALUES (true, false);
  REVOKE ALL ON TABLE public.dm_release_control FROM PUBLIC, anon, authenticated;

  -- Replace only the DM-specific webhook, not Production's existing social
  -- webhook. The HTTP request contains a message ID and no message body.
  EXECUTE $replace$
    CREATE OR REPLACE FUNCTION public.dm_send_push_notification_webhook()
    RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
    DECLARE webhook_key text;
    BEGIN
      IF NOT COALESCE((
        SELECT enabled FROM public.dm_release_control WHERE singleton = true
      ), false) THEN RETURN NEW; END IF;

      SELECT decrypted_secret INTO webhook_key
      FROM vault.decrypted_secrets
      WHERE name = 'push_notification_webhook' LIMIT 1;
      IF webhook_key IS NULL THEN
        RAISE WARNING 'DM push skipped: webhook credential not available';
        RETURN NEW;
      END IF;

      PERFORM net.http_post(
        url := 'https://nxtowcheatxouypzqkzc.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object('Content-Type','application/json','apikey',webhook_key),
        body := jsonb_build_object('type','INSERT','table','dm_messages',
          'schema','public','record',jsonb_build_object('id',NEW.id),'old_record',NULL),
        timeout_milliseconds := 5000
      );
      RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'DM push queue failed: %', SQLERRM;
      RETURN NEW;
    END;
    $body$
  $replace$;
  REVOKE ALL ON FUNCTION public.dm_send_push_notification_webhook() FROM PUBLIC, anon, authenticated;

  -- Deny direct and SECURITY DEFINER writes while the staged release is OFF.
  EXECUTE $function$
    CREATE FUNCTION public.dm_require_release_enabled()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
    BEGIN
      IF COALESCE((SELECT enabled FROM public.dm_release_control WHERE singleton = true), false)
      THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'Direct Messaging is not yet available';
    END;
    $body$
  $function$;
  REVOKE ALL ON FUNCTION public.dm_require_release_enabled() FROM PUBLIC, anon, authenticated;
  CREATE TRIGGER dm_hold_conversation_creation BEFORE INSERT ON public.dm_conversations
    FOR EACH ROW EXECUTE FUNCTION public.dm_require_release_enabled();
  CREATE TRIGGER dm_hold_message_creation BEFORE INSERT ON public.dm_messages
    FOR EACH ROW EXECUTE FUNCTION public.dm_require_release_enabled();

  REVOKE EXECUTE ON FUNCTION public.dm_create_conversation(uuid),
    public.dm_send_message(uuid,text), public.dm_mark_read(uuid,uuid),
    public.dm_share_collection(uuid,uuid), public.dm_list_share_recipients()
    FROM PUBLIC, anon, authenticated;
  REVOKE SELECT ON TABLE public.dm_conversations, public.dm_messages,
    public.dm_read_states FROM PUBLIC, anon, authenticated;

  -- Remove only our specifically marked, unused temporary compatibility
  -- function after the historical 0500 migration has succeeded.
  DROP FUNCTION public.send_push_notification_webhook();
  RAISE NOTICE 'Production DM schema staged with database release switch OFF';
END;
$stage$;
COMMIT;
