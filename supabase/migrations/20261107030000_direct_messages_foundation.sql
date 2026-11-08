-- Top 3 direct messaging: Development-first, private one-to-one foundation.
-- Does not create a UI, send push notifications, or enable Realtime broadcasts.
-- Application access: participant-only reads; all writes through guarded RPCs.
BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.follows') IS NULL
     OR to_regclass('public.blocks') IS NULL THEN
    RAISE EXCEPTION 'STOP: expected Top 3 profile/follow/block schema is missing';
  END IF;

  IF to_regprocedure('public.contains_blocked_content(text)') IS NULL THEN
    RAISE EXCEPTION 'STOP: expected Top 3 content filter is missing';
  END IF;

  IF to_regclass('public.dm_conversations') IS NOT NULL
     OR to_regclass('public.dm_messages') IS NOT NULL
     OR to_regprocedure('public.dm_create_conversation(uuid)') IS NOT NULL
     OR to_regprocedure('public.dm_send_message(uuid,text)') IS NOT NULL
     OR to_regprocedure('public.dm_can_message(uuid,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: direct message objects already exist; inspect before applying';
  END IF;
END;
$guard$;

CREATE TABLE public.dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_high_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT dm_conversations_ordered_pair CHECK (user_low_id < user_high_id),
  CONSTRAINT dm_conversations_one_per_pair UNIQUE (user_low_id, user_high_id)
);

CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_messages_body_length CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000)
);

CREATE INDEX dm_conversations_user_low_recent_idx
  ON public.dm_conversations (user_low_id, last_message_at DESC NULLS LAST);
CREATE INDEX dm_conversations_user_high_recent_idx
  ON public.dm_conversations (user_high_id, last_message_at DESC NULLS LAST);
CREATE INDEX dm_messages_conversation_recent_idx
  ON public.dm_messages (conversation_id, created_at DESC, id DESC);
CREATE INDEX dm_messages_sender_recent_idx
  ON public.dm_messages (sender_id, created_at DESC);

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY dm_conversations_participant_select
  ON public.dm_conversations FOR SELECT TO authenticated
  USING (
    user_low_id = (SELECT auth.uid())
    OR user_high_id = (SELECT auth.uid())
  );

CREATE POLICY dm_messages_participant_select
  ON public.dm_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.dm_conversations AS c
      WHERE c.id = conversation_id
        AND (
          c.user_low_id = (SELECT auth.uid())
          OR c.user_high_id = (SELECT auth.uid())
        )
    )
  );

-- Client writes are deliberately not permitted directly to these tables.
REVOKE ALL ON TABLE public.dm_conversations, public.dm_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.dm_conversations, public.dm_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.dm_conversations, public.dm_messages TO service_role;

-- Internal permission check bypasses the blocks table's self-only RLS,
-- so a block from EITHER account prevents starting or sending messages.
CREATE FUNCTION public.dm_can_message(p_first uuid, p_second uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT p_first IS NOT NULL
    AND p_second IS NOT NULL
    AND p_first <> p_second
    AND EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = p_first AND f.following_id = p_second
    )
    AND EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = p_second AND f.following_id = p_first
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = p_first AND b.blocked_user_id = p_second)
         OR (b.blocker_id = p_second AND b.blocked_user_id = p_first)
    );
$fn$;

REVOKE ALL ON FUNCTION public.dm_can_message(uuid,uuid) FROM PUBLIC, anon, authenticated;

-- Idempotent per user pair: opening the same chat twice never duplicates it.
CREATE FUNCTION public.dm_create_conversation(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_user_id uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_conversation_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.dm_can_message(v_user_id, p_other_user_id) THEN
    RAISE EXCEPTION 'Messaging requires mutual follows and no blocks';
  END IF;

  v_low := LEAST(v_user_id, p_other_user_id);
  v_high := GREATEST(v_user_id, p_other_user_id);

  INSERT INTO public.dm_conversations (user_low_id, user_high_id)
  VALUES (v_low, v_high)
  ON CONFLICT (user_low_id, user_high_id) DO NOTHING;

  SELECT c.id INTO v_conversation_id
  FROM public.dm_conversations c
  WHERE c.user_low_id = v_low AND c.user_high_id = v_high;

  IF v_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Unable to open conversation';
  END IF;
  RETURN v_conversation_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_create_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_create_conversation(uuid) TO authenticated;

-- Server-enforced sender identity, membership, mutual follows, blocks,
-- content filtering, length, and a basic per-sender message rate limit.
CREATE FUNCTION public.dm_send_message(p_conversation_id uuid, p_body text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_user_id uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_other uuid;
  v_body text := btrim(p_body);
  v_message_id uuid;
  v_created_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_body IS NULL OR char_length(v_body) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 2000 characters';
  END IF;

  SELECT c.user_low_id, c.user_high_id INTO v_low, v_high
  FROM public.dm_conversations c
  WHERE c.id = p_conversation_id
    AND (c.user_low_id = v_user_id OR c.user_high_id = v_user_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  v_other := CASE WHEN v_user_id = v_low THEN v_high ELSE v_low END;
  IF NOT public.dm_can_message(v_user_id, v_other) THEN
    RAISE EXCEPTION 'Messaging requires mutual follows and no blocks';
  END IF;

  IF public.contains_blocked_content(v_body) THEN
    RAISE EXCEPTION 'Message contains disallowed content';
  END IF;

  -- Serialize sends from the same account across conversations so a burst
  -- of parallel requests cannot trivially bypass the basic rate limit.
  PERFORM pg_advisory_xact_lock(hashtext('top3-dm-send:' || v_user_id::text)::bigint);

  IF (
    SELECT count(*) FROM public.dm_messages m
    WHERE m.sender_id = v_user_id
      AND m.created_at > clock_timestamp() - interval '1 minute'
  ) >= 20 THEN
    RAISE EXCEPTION 'Too many messages; try again in a minute';
  END IF;

  INSERT INTO public.dm_messages (conversation_id, sender_id, body)
  VALUES (p_conversation_id, v_user_id, v_body)
  RETURNING id, created_at INTO v_message_id, v_created_at;

  UPDATE public.dm_conversations c
  SET last_message_at = GREATEST(COALESCE(c.last_message_at, v_created_at), v_created_at)
  WHERE c.id = p_conversation_id;

  RETURN v_message_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_send_message(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_send_message(uuid,text) TO authenticated;

COMMIT;
