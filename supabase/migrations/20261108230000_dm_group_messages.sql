-- Top 3 Group Direct Messaging: private message sending and per-user read state.
-- DEVELOPMENT FIRST. Additive to group foundation + membership migrations.
-- No Realtime publication, notification trigger, group sharing, or existing DM changes.
-- Invited users cannot read messages; accepted members see only messages sent
-- on/after they joined and not sent by someone with a current mutual block.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF to_regclass('public.dm_group_conversations') IS NULL
     OR to_regclass('public.dm_group_members') IS NULL
     OR to_regclass('public.dm_group_messages') IS NULL
     OR to_regclass('public.dm_group_read_states') IS NULL
     OR to_regclass('public.dm_messages') IS NULL
     OR to_regclass('public.blocks') IS NULL
     OR to_regprocedure('public.dm_group_is_accepted_member(uuid)') IS NULL
     OR to_regprocedure('public.dm_group_leave(uuid)') IS NULL
     OR to_regprocedure('public.contains_blocked_content(text)') IS NULL THEN
    RAISE EXCEPTION 'STOP: expected group membership or DM safety prerequisites missing';
  END IF;

  IF to_regprocedure('public.dm_group_can_read_message(uuid,uuid,timestamptz)') IS NOT NULL
     OR to_regprocedure('public.dm_group_send_message(uuid,text)') IS NOT NULL
     OR to_regprocedure('public.dm_group_mark_read(uuid,uuid)') IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename IN ('dm_group_messages', 'dm_group_read_states')
     ) THEN
    RAISE EXCEPTION 'STOP: group messaging permissions or functions already exist; inspect first';
  END IF;

  IF has_table_privilege('authenticated', 'public.dm_group_messages', 'SELECT')
     OR has_table_privilege('authenticated', 'public.dm_group_read_states', 'SELECT')
     OR EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
         AND tablename IN ('dm_group_messages', 'dm_group_read_states')
     ) THEN
    RAISE EXCEPTION 'STOP: group messaging tables unexpectedly exposed before migration';
  END IF;
END;
$guard$;

-- Used by participant-only message RLS and the mark-read RPC. A SECURITY
-- DEFINER helper is necessary to detect *either direction* of blocks without
-- relying on the blocks table's user-facing RLS visibility.
CREATE FUNCTION public.dm_group_can_read_message(
  p_group_id uuid,
  p_sender_id uuid,
  p_created_at timestamptz
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.dm_group_members gm
      WHERE gm.group_id = p_group_id
        AND gm.user_id = (SELECT auth.uid())
        AND gm.status = 'accepted'
        AND gm.joined_at IS NOT NULL
        AND p_created_at >= gm.joined_at
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = (SELECT auth.uid()) AND b.blocked_user_id = p_sender_id)
         OR (b.blocker_id = p_sender_id AND b.blocked_user_id = (SELECT auth.uid()))
    );
$fn$;
REVOKE ALL ON FUNCTION
  public.dm_group_can_read_message(uuid,uuid,timestamptz)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.dm_group_can_read_message(uuid,uuid,timestamptz)
TO authenticated;

-- Messages are readable only while accepted, only from the moment the caller
-- joined, and never when removed or blocked in either direction.
CREATE POLICY dm_group_messages_member_select
  ON public.dm_group_messages FOR SELECT TO authenticated
  USING (
    removed_at IS NULL
    AND public.dm_group_can_read_message(group_id, sender_id, created_at)
  );

-- Read state is private to its owner; other members cannot inspect receipts.
CREATE POLICY dm_group_read_states_own_select
  ON public.dm_group_read_states FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.dm_group_is_accepted_member(group_id)
  );

GRANT SELECT ON TABLE
  public.dm_group_messages,
  public.dm_group_read_states
TO authenticated;
-- No direct INSERT/UPDATE/DELETE grants: every write is via guarded RPCs.

-- Text-only messages in this phase. Shared-collection messages are added by
-- a future separate migration after all recipient visibility checks exist.
CREATE FUNCTION public.dm_group_send_message(p_group_id uuid, p_body text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_sender uuid := auth.uid();
  v_body text := btrim(p_body);
  v_message_id uuid;
  v_created_at timestamptz;
BEGIN
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_body IS NULL OR char_length(v_body) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 2000 characters';
  END IF;
  IF public.contains_blocked_content(v_body) THEN
    RAISE EXCEPTION 'Message contains disallowed content';
  END IF;

  -- Coordinate with invitations, acceptance, and leaving, which also lock the
  -- group row. Prevent a send from racing with a membership state transition.
  PERFORM 1
  FROM public.dm_group_conversations c
  WHERE c.id = p_group_id
  FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.dm_group_members m
    WHERE m.group_id = p_group_id
      AND m.user_id = v_sender AND m.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Group unavailable';
  END IF;

  -- Never deliver a new message between accounts with a block in either
  -- direction. Other, unblocked accepted participants may continue chatting.
  IF EXISTS (
    SELECT 1
    FROM public.dm_group_members m
    JOIN public.blocks b ON (
      (b.blocker_id = v_sender AND b.blocked_user_id = m.user_id)
      OR (b.blocked_user_id = v_sender AND b.blocker_id = m.user_id)
    )
    WHERE m.group_id = p_group_id
      AND m.status = 'accepted'
      AND m.user_id <> v_sender
  ) THEN
    RAISE EXCEPTION 'Messaging unavailable while a member is blocked';
  END IF;

  -- Share the sender's advisory lock with 1:1 DM sends to limit concurrent
  -- requests. Count both 1:1 and group messages for this RPC's rate check.
  PERFORM pg_advisory_xact_lock(
    hashtext('top3-dm-send:' || v_sender::text)::bigint
  );
  v_created_at := clock_timestamp();

  IF (
    (SELECT count(*) FROM public.dm_messages m
     WHERE m.sender_id = v_sender
       AND m.created_at > v_created_at - interval '1 minute')
    +
    (SELECT count(*) FROM public.dm_group_messages m
     WHERE m.sender_id = v_sender
       AND m.created_at > v_created_at - interval '1 minute')
  ) >= 20 THEN
    RAISE EXCEPTION 'Too many messages; try again in a minute';
  END IF;

  -- clock_timestamp() is deliberate: the joining timestamps also use it,
  -- so a legitimate message is not incorrectly dated before a new member's
  -- acceptance when both actions occur in a single transaction.
  INSERT INTO public.dm_group_messages
    (group_id, sender_id, body, created_at)
  VALUES (p_group_id, v_sender, v_body, v_created_at)
  RETURNING id INTO v_message_id;

  UPDATE public.dm_group_conversations c
  SET last_message_at = GREATEST(
    COALESCE(c.last_message_at, v_created_at), v_created_at
  )
  WHERE c.id = p_group_id;

  RETURN v_message_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_group_send_message(uuid,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dm_group_send_message(uuid,text)
TO authenticated;

-- Mark only a message the caller can actually read, never the wall clock.
-- Prevents an unseen arriving message from being incorrectly marked as read.
CREATE FUNCTION public.dm_group_mark_read(
  p_group_id uuid,
  p_message_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_user_id uuid := auth.uid();
  v_message_time timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Serialize against a concurrent group leave or membership change.
  PERFORM 1
  FROM public.dm_group_conversations c
  WHERE c.id = p_group_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message unavailable';
  END IF;

  SELECT m.created_at INTO v_message_time
  FROM public.dm_group_messages m
  WHERE m.id = p_message_id
    AND m.group_id = p_group_id
    AND m.removed_at IS NULL
    AND public.dm_group_can_read_message(m.group_id, m.sender_id, m.created_at);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message unavailable';
  END IF;

  INSERT INTO public.dm_group_read_states AS rs
    (group_id, user_id, last_read_at)
  VALUES (p_group_id, v_user_id, v_message_time)
  ON CONFLICT (group_id, user_id)
  DO UPDATE SET last_read_at = GREATEST(
    rs.last_read_at, EXCLUDED.last_read_at
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_group_mark_read(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dm_group_mark_read(uuid,uuid)
TO authenticated;

COMMIT;
