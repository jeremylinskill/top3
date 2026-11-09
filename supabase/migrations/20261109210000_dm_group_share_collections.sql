-- Top 3: share an existing published Top 3 into an accepted group chat.
-- DEVELOPMENT FIRST. Additive to group DM foundation, membership, messages,
-- and Realtime. No changes to one-to-one DM or Production release controls.
-- A forwarded collection must remain visible to ALL currently accepted members;
-- members joining in the future cannot read messages sent before they joined.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF to_regclass('public.collections') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.follows') IS NULL
     OR to_regclass('public.blocks') IS NULL
     OR to_regclass('public.dm_group_conversations') IS NULL
     OR to_regclass('public.dm_group_members') IS NULL
     OR to_regclass('public.dm_group_messages') IS NULL
     OR to_regprocedure('public.dm_group_send_message(uuid,text)') IS NULL
     OR to_regprocedure('public.dm_group_is_accepted_member(uuid)') IS NULL
     OR to_regprocedure('public.can_view_published_collection(uuid)') IS NULL THEN
    RAISE EXCEPTION 'STOP: group sharing prerequisites missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dm_group_messages'
      AND column_name = 'shared_collection_id'
  ) THEN
    RAISE EXCEPTION 'STOP: structured group collection reference missing';
  END IF;
  IF to_regprocedure('public.dm_group_share_collection(uuid,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: group sharing RPC already exists';
  END IF;
END;
$guard$;

-- The server sends a normal group message first (which locks the group row,
-- validates membership, blocks, text safety, and rate limits). The structured
-- collection reference is attached before the same transaction commits.
-- Any failure raises an error and rolls the entire send back atomically.
CREATE FUNCTION public.dm_group_share_collection(
  p_group_id uuid,
  p_collection_id uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_sender uuid := auth.uid();
  v_owner uuid;
  v_message uuid;
BEGIN
  IF v_sender IS NULL OR p_group_id IS NULL OR p_collection_id IS NULL THEN
    RAISE EXCEPTION 'Unable to share this Top 3';
  END IF;

  SELECT c.user_id INTO v_owner
  FROM public.collections c
  WHERE c.id = p_collection_id
    AND c.status = 'published'
    AND c.published_at IS NOT NULL
    AND c.removed_at IS NULL
  FOR SHARE;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Unable to share this Top 3';
  END IF;

  -- Use the same sender-visibility rule as existing one-to-one DM sharing.
  IF v_owner <> v_sender
     AND NOT COALESCE(public.can_view_published_collection(v_owner), false) THEN
    RAISE EXCEPTION 'Unable to share this Top 3';
  END IF;

  -- Establish the group row lock and all send protections. If any subsequent
  -- collection check fails, PostgreSQL rolls this message back as well.
  v_message := public.dm_group_send_message(p_group_id, 'Shared a Top 3');

  -- Everyone who has already accepted must be able to open the source list.
  -- For a private owner, recipient must follow that owner. Both directions
  -- of owner/recipient blocking are checked, including when the owner is the
  -- sender. Invited users cannot read pre-join messages.
  IF EXISTS (
    SELECT 1
    FROM public.dm_group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.status = 'accepted'
      AND gm.user_id <> v_sender
      AND (
        EXISTS (
          SELECT 1 FROM public.blocks b
          WHERE (b.blocker_id = v_owner AND b.blocked_user_id = gm.user_id)
             OR (b.blocker_id = gm.user_id AND b.blocked_user_id = v_owner)
        )
        OR NOT (
          gm.user_id = v_owner
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_owner AND p.is_public = true
          )
          OR EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.follower_id = gm.user_id AND f.following_id = v_owner
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'Unable to share this Top 3 with everyone in the group';
  END IF;

  UPDATE public.dm_group_messages m
  SET shared_collection_id = p_collection_id
  WHERE m.id = v_message
    AND m.group_id = p_group_id
    AND m.sender_id = v_sender;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unable to share this Top 3';
  END IF;

  RETURN p_group_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dm_group_share_collection(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dm_group_share_collection(uuid,uuid)
  TO authenticated;

COMMIT;
