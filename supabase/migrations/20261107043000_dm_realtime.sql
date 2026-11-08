-- Top 3 DMs: realtime-safe metadata signals, Development first.
-- We deliberately do not publish dm_messages: message bodies remain private
-- and are fetched through the existing participant-only RLS SELECT policy.
BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.dm_conversations') IS NULL
     OR to_regclass('public.dm_messages') IS NULL
     OR to_regclass('public.dm_read_states') IS NULL THEN
    RAISE EXCEPTION 'STOP: direct messaging foundation/read tracking missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'STOP: expected Supabase Realtime publication is missing';
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'dm_conversations'
        AND policyname = 'dm_conversations_participant_select'
  ) OR NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'dm_read_states'
        AND policyname = 'dm_read_states_own_select'
  ) OR NOT (
      SELECT relrowsecurity FROM pg_class WHERE oid = 'public.dm_conversations'::regclass
  ) OR NOT (
      SELECT relrowsecurity FROM pg_class WHERE oid = 'public.dm_read_states'::regclass
  ) THEN
    RAISE EXCEPTION 'STOP: expected participant/own-read-state RLS policies missing';
  END IF;

  IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'dm_conversations'
        AND column_name = 'realtime_revision'
  ) OR to_regprocedure('public.dm_signal_removed_message()') IS NOT NULL OR EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.dm_messages'::regclass
        AND tgname = 'dm_signal_message_removal'
  ) THEN
    RAISE EXCEPTION 'STOP: DM realtime objects already exist';
  END IF;

  IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
        AND tablename IN ('dm_conversations', 'dm_read_states', 'dm_messages')
  ) THEN
    RAISE EXCEPTION 'STOP: DM table already published; inspect before continuing';
  END IF;
END;
$guard$;

-- A moderator removal must notify already-open conversations without
-- changing last_message_at (which is used for inbox ordering).
ALTER TABLE public.dm_conversations
  ADD COLUMN realtime_revision bigint NOT NULL DEFAULT 0;

CREATE FUNCTION public.dm_signal_removed_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  UPDATE public.dm_conversations
  SET realtime_revision = realtime_revision + 1
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_signal_removed_message() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER dm_signal_message_removal
AFTER UPDATE OF removed_at ON public.dm_messages
FOR EACH ROW
WHEN (OLD.removed_at IS DISTINCT FROM NEW.removed_at)
EXECUTE FUNCTION public.dm_signal_removed_message();

-- Minimal RLS-protected metadata only, never dm_messages or message bodies.
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_read_states;

COMMIT;
