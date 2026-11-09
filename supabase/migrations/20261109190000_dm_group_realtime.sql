-- Top 3 group DM: RLS-protected metadata-only Realtime signals.
-- DEVELOPMENT FIRST. No message bodies or group message rows are published.
-- Existing one-to-one DM Realtime and tables are not modified.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF to_regclass('public.dm_group_conversations') IS NULL
     OR to_regclass('public.dm_group_members') IS NULL
     OR to_regclass('public.dm_group_messages') IS NULL
     OR to_regclass('public.dm_group_read_states') IS NULL
     OR to_regprocedure('public.dm_group_send_message(uuid,text)') IS NULL
     OR to_regprocedure('public.dm_group_can_read_message(uuid,uuid,timestamptz)') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'STOP: group messaging/Realtime prerequisites missing';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class
          WHERE oid = 'public.dm_group_conversations'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class
          WHERE oid = 'public.dm_group_members'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class
          WHERE oid = 'public.dm_group_read_states'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class
          WHERE oid = 'public.dm_group_messages'::regclass)
     OR NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE schemaname = 'public'
         AND tablename = 'dm_group_conversations'
         AND policyname = 'dm_group_conversations_member_select'
     ) OR NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE schemaname = 'public'
         AND tablename = 'dm_group_members'
         AND policyname = 'dm_group_members_participant_select'
     ) OR NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE schemaname = 'public'
         AND tablename = 'dm_group_read_states'
         AND policyname = 'dm_group_read_states_own_select'
     ) THEN
    RAISE EXCEPTION 'STOP: group participant-only/own-read RLS missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename IN (
        'dm_group_conversations', 'dm_group_members',
        'dm_group_messages', 'dm_group_read_states'
      )
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dm_group_conversations'
      AND column_name = 'realtime_revision'
  ) OR to_regprocedure('public.dm_group_signal_removed_message()') IS NOT NULL
    OR to_regprocedure('public.dm_group_signal_membership_change()') IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.dm_group_messages'::regclass
        AND tgname = 'dm_group_signal_message_removal'
    ) OR EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.dm_group_members'::regclass
        AND tgname = 'dm_group_signal_membership_change'
    ) THEN
    RAISE EXCEPTION 'STOP: group Realtime objects already exist; inspect first';
  END IF;
END;
$guard$;

-- Message removal should trigger a fresh RLS-protected fetch without
-- changing message-time ordering. No content appears in the signal.
ALTER TABLE public.dm_group_conversations
  ADD COLUMN realtime_revision bigint NOT NULL DEFAULT 0;

CREATE FUNCTION public.dm_group_signal_removed_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  UPDATE public.dm_group_conversations
  SET realtime_revision = realtime_revision + 1
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_group_signal_removed_message()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER dm_group_signal_message_removal
AFTER UPDATE OF removed_at ON public.dm_group_messages
FOR EACH ROW
WHEN (OLD.removed_at IS DISTINCT FROM NEW.removed_at)
EXECUTE FUNCTION public.dm_group_signal_removed_message();

-- Invitations, acceptances, declines and departures update the same
-- participant-visible metadata row. This avoids publishing group rosters or
-- personal invitation details as Realtime events.
CREATE FUNCTION public.dm_group_signal_membership_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  UPDATE public.dm_group_conversations
  SET realtime_revision = realtime_revision + 1
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_group_signal_membership_change()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER dm_group_signal_membership_change
AFTER INSERT OR UPDATE OF status ON public.dm_group_members
FOR EACH ROW
EXECUTE FUNCTION public.dm_group_signal_membership_change();

-- Publish only group metadata and each account's private read positions.
-- Never publish dm_group_messages or dm_group_members: the mobile client
-- fetches those rows independently through the established RLS policies.
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_group_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_group_read_states;

COMMIT;
