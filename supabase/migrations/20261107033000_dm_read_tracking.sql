-- Top 3 direct messaging: private per-user read tracking (Development only).
-- Read position belongs only to its owner; no read receipts are exposed.
BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.dm_conversations') IS NULL
     OR to_regclass('public.dm_messages') IS NULL
     OR to_regprocedure('public.dm_send_message(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'STOP: direct messaging foundation is missing';
  END IF;

  IF to_regclass('public.dm_read_states') IS NOT NULL
     OR to_regprocedure('public.dm_mark_read(uuid,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: read tracking already exists; inspect before applying';
  END IF;
END;
$guard$;

CREATE TABLE public.dm_read_states (
  conversation_id uuid NOT NULL
    REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX dm_read_states_user_idx
  ON public.dm_read_states (user_id, conversation_id);

ALTER TABLE public.dm_read_states ENABLE ROW LEVEL SECURITY;

-- Users can inspect only their own read position, never someone else's.
CREATE POLICY dm_read_states_own_select
  ON public.dm_read_states FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.user_low_id = (SELECT auth.uid())
             OR c.user_high_id = (SELECT auth.uid()))
    )
  );

-- The client cannot create or update a read position directly.
REVOKE ALL ON TABLE public.dm_read_states FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.dm_read_states TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dm_read_states TO service_role;

CREATE FUNCTION public.dm_mark_read(
  p_conversation_id uuid,
  p_message_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_user_id uuid := auth.uid();
  v_message_time timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.dm_conversations c
    WHERE c.id = p_conversation_id
      AND (c.user_low_id = v_user_id OR c.user_high_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  -- The caller supplies the last message actually displayed in the chat.
  -- Using now() could incorrectly mark an unseen arriving message as read.
  SELECT m.created_at INTO v_message_time
  FROM public.dm_messages m
  WHERE m.id = p_message_id
    AND m.conversation_id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found in this conversation';
  END IF;

  INSERT INTO public.dm_read_states AS rs (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, v_user_id, v_message_time)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET last_read_at = GREATEST(
    rs.last_read_at,
    EXCLUDED.last_read_at
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_mark_read(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_mark_read(uuid,uuid) TO authenticated;

COMMIT;
