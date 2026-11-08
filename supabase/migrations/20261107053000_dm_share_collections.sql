-- Top 3: share a published Top 3 as a structured, permission-checked DM.
-- Development first. Safe to apply only after the November 7 DM migrations.
BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.collections') IS NULL
     OR to_regclass('public.dm_messages') IS NULL
     OR to_regclass('public.dm_conversations') IS NULL
     OR to_regprocedure('public.dm_can_message(uuid,uuid)') IS NULL
     OR to_regprocedure('public.dm_send_message(uuid,text)') IS NULL
     OR to_regprocedure('public.dm_create_conversation(uuid)') IS NULL
     OR to_regprocedure('public.can_view_published_collection(uuid)') IS NULL THEN
    RAISE EXCEPTION 'STOP: expected collection or DM schema missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dm_messages'
      AND column_name = 'shared_collection_id'
  ) OR to_regprocedure('public.dm_share_collection(uuid,uuid)') IS NOT NULL
    OR to_regprocedure('public.dm_list_share_recipients()') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: shared Top 3 DM objects already exist';
  END IF;
END;
$guard$;

ALTER TABLE public.dm_messages
  ADD COLUMN shared_collection_id uuid
  REFERENCES public.collections(id) ON DELETE SET NULL;

CREATE INDEX dm_messages_shared_collection_id_idx
  ON public.dm_messages(shared_collection_id)
  WHERE shared_collection_id IS NOT NULL;

-- Return only eligible mutual followers; never expose blocks through a
-- client query that cannot see the other user's blocking relationships.
CREATE FUNCTION public.dm_list_share_recipients()
RETURNS TABLE(recipient_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT f.following_id AS recipient_id
  FROM public.follows f
  WHERE auth.uid() IS NOT NULL
    AND f.follower_id = auth.uid()
    AND public.dm_can_message(auth.uid(), f.following_id)
  ORDER BY f.created_at DESC
  LIMIT 100;
$fn$;
REVOKE ALL ON FUNCTION public.dm_list_share_recipients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_list_share_recipients() TO authenticated;

-- Send one normal DM, retaining all existing identity, mutual-follow,
-- block, content and rate-limit checks in dm_send_message. A collection
-- reference is appended atomically in the same transaction before commit.
CREATE FUNCTION public.dm_share_collection(
  p_recipient_id uuid,
  p_collection_id uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_sender uuid := auth.uid();
  v_owner uuid;
  v_conversation uuid;
  v_message uuid;
BEGIN
  IF v_sender IS NULL OR p_recipient_id IS NULL OR p_collection_id IS NULL
     OR NOT public.dm_can_message(v_sender, p_recipient_id) THEN
    RAISE EXCEPTION 'Unable to share this Top 3';
  END IF;

  SELECT c.user_id INTO v_owner
  FROM public.collections c
  WHERE c.id = p_collection_id
    AND c.status = 'published'
    AND c.published_at IS NOT NULL
    AND c.removed_at IS NULL;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Unable to share this Top 3';
  END IF;

  -- Sender must be able to view the source list. Unlike the regular app
  -- SELECT RLS, the owner of a private list can also view their own list.
  IF v_owner <> v_sender
     AND NOT public.can_view_published_collection(v_owner) THEN
    RAISE EXCEPTION 'Unable to share this Top 3';
  END IF;

  -- Verify recipient can view it as well, without impersonating recipient
  -- auth.uid(). A revoked follow, a private owner or an owner block fails.
  IF EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = v_owner AND b.blocked_user_id = p_recipient_id)
       OR (b.blocker_id = p_recipient_id AND b.blocked_user_id = v_owner)
  ) OR NOT (
    v_owner = p_recipient_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_owner AND p.is_public = true
    )
    OR EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = p_recipient_id AND f.following_id = v_owner
    )
  ) THEN
    RAISE EXCEPTION 'Unable to share this Top 3';
  END IF;

  v_conversation := public.dm_create_conversation(p_recipient_id);
  v_message := public.dm_send_message(v_conversation, 'Shared a Top 3');

  UPDATE public.dm_messages m
  SET shared_collection_id = p_collection_id
  WHERE m.id = v_message AND m.sender_id = v_sender;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unable to share this Top 3';
  END IF;

  RETURN v_conversation;
END;
$fn$;
REVOKE ALL ON FUNCTION public.dm_share_collection(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_share_collection(uuid,uuid) TO authenticated;

COMMIT;
