-- Top 3: report individual DMs using the existing reports/moderation queue.
-- Development-only until reviewed, tested, and explicitly approved for Production.
-- This migration is additive; do not edit previously applied DM migrations.
BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.reports') IS NULL
     OR to_regclass('public.dm_messages') IS NULL
     OR to_regclass('public.dm_conversations') IS NULL THEN
    RAISE EXCEPTION 'STOP: reports or direct messaging foundation is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reports'::regclass
      AND conname IN ('reports_target_type_check', 'reports_target_fields_check')
    GROUP BY conrelid
    HAVING count(DISTINCT conname) = 2
  ) THEN
    RAISE EXCEPTION 'STOP: expected reports constraints were changed; inspect first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reports' AND column_name='reported_message_id'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='dm_messages' AND column_name='removed_at'
  ) THEN
    RAISE EXCEPTION 'STOP: message reporting objects already exist';
  END IF;
END;
$guard$;

-- Keep original message data for admin review; hide removed messages from app clients.
ALTER TABLE public.dm_messages ADD COLUMN removed_at timestamptz;
ALTER TABLE public.reports ADD COLUMN reported_message_id uuid
  REFERENCES public.dm_messages(id) ON DELETE CASCADE;

ALTER TABLE public.reports DROP CONSTRAINT reports_target_fields_check;
ALTER TABLE public.reports DROP CONSTRAINT reports_target_type_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN ('user', 'post', 'comment', 'message'));
ALTER TABLE public.reports ADD CONSTRAINT reports_target_fields_check CHECK (
  (target_type = 'user' AND reported_post_id IS NULL AND reported_comment_id IS NULL AND reported_message_id IS NULL)
  OR (target_type = 'post' AND reported_post_id IS NOT NULL AND reported_comment_id IS NULL AND reported_message_id IS NULL)
  OR (target_type = 'comment' AND reported_post_id IS NULL AND reported_comment_id IS NOT NULL AND reported_message_id IS NULL)
  OR (target_type = 'message' AND reported_post_id IS NULL AND reported_comment_id IS NULL AND reported_message_id IS NOT NULL)
);

-- A recipient can report a particular message only once.
CREATE UNIQUE INDEX reports_one_per_reporter_dm_idx
  ON public.reports(reporter_id, reported_message_id)
  WHERE reported_message_id IS NOT NULL;

-- Reporters must be the *recipient*, and the reported user must be the sender.
-- SECURITY DEFINER lets this verify the DM without exposing other conversations.
CREATE FUNCTION public.dm_validate_message_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_sender uuid;
  v_low uuid;
  v_high uuid;
  v_removed_at timestamptz;
BEGIN
  IF NEW.target_type <> 'message' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> NEW.reporter_id THEN
    RAISE EXCEPTION 'Invalid reported message';
  END IF;

  SELECT m.sender_id, c.user_low_id, c.user_high_id, m.removed_at
    INTO v_sender, v_low, v_high, v_removed_at
  FROM public.dm_messages m
  JOIN public.dm_conversations c ON c.id = m.conversation_id
  WHERE m.id = NEW.reported_message_id;

  IF NOT FOUND OR v_removed_at IS NOT NULL
     OR v_sender <> NEW.reported_user_id
     OR v_sender = NEW.reporter_id
     OR NOT (
       (v_low = NEW.reporter_id AND v_high = v_sender)
       OR (v_high = NEW.reporter_id AND v_low = v_sender)
     ) THEN
    RAISE EXCEPTION 'Invalid reported message';
  END IF;

  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_validate_message_report() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER dm_verify_report_before_insert
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  WHEN (NEW.target_type = 'message')
  EXECUTE FUNCTION public.dm_validate_message_report();

-- Removed messages must not be readable via regular participant SELECTs.
-- service_role still has full access for authorized moderation review.
DROP POLICY dm_messages_participant_select ON public.dm_messages;
CREATE POLICY dm_messages_participant_select
  ON public.dm_messages FOR SELECT TO authenticated
  USING (
    removed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.user_low_id = (SELECT auth.uid())
          OR c.user_high_id = (SELECT auth.uid()))
    )
  );

COMMIT;
