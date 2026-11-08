-- Top 3 Group Direct Messaging: invitations, memberships and private roster reads.
-- DEVELOPMENT FIRST. Adds guarded RPCs; leaves existing one-to-one DMs untouched.
-- Does NOT unlock group messages, group read states, realtime or push.
-- Invitations are opt-in; creator initially invites 2-9 mutual followers.
-- Max 10 invited/accepted slots per group, including the creator.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF to_regclass('public.dm_group_conversations') IS NULL
     OR to_regclass('public.dm_group_members') IS NULL
     OR to_regclass('public.dm_group_messages') IS NULL
     OR to_regclass('public.dm_group_read_states') IS NULL
     OR to_regclass('public.blocks') IS NULL
     OR to_regprocedure('public.dm_can_message(uuid,uuid)') IS NULL
     OR to_regprocedure('public.contains_blocked_content(text)') IS NULL THEN
    RAISE EXCEPTION 'STOP: expected group foundation or one-to-one safety helpers missing';
  END IF;
  IF to_regprocedure('public.dm_group_can_view(uuid)') IS NOT NULL
     OR to_regprocedure('public.dm_group_is_accepted_member(uuid)') IS NOT NULL
     OR to_regprocedure('public.dm_group_create(text,uuid[])') IS NOT NULL
     OR to_regprocedure('public.dm_group_invite(uuid,uuid)') IS NOT NULL
     OR to_regprocedure('public.dm_group_respond_invitation(uuid,boolean)') IS NOT NULL
     OR to_regprocedure('public.dm_group_leave(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: group membership functions already exist; inspect before migrating';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('dm_group_conversations', 'dm_group_members')
  ) THEN
    RAISE EXCEPTION 'STOP: group membership RLS policies already exist; inspect first';
  END IF;
END;
$guard$;

-- SECURITY DEFINER avoids recursive RLS evaluation on dm_group_members.
-- Both helpers inspect only the authenticated caller's own membership.
CREATE FUNCTION public.dm_group_can_view(p_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.dm_group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = (SELECT auth.uid())
      AND gm.status IN ('accepted', 'invited')
  );
$fn$;

CREATE FUNCTION public.dm_group_is_accepted_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.dm_group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = (SELECT auth.uid())
      AND gm.status = 'accepted'
  );
$fn$;

REVOKE ALL ON FUNCTION
  public.dm_group_can_view(uuid),
  public.dm_group_is_accepted_member(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.dm_group_can_view(uuid),
  public.dm_group_is_accepted_member(uuid)
TO authenticated;

-- Invitees may see the group name but only their own membership until they join.
-- Accepted members can see the current invited/accepted roster.
CREATE POLICY dm_group_conversations_member_select
  ON public.dm_group_conversations FOR SELECT TO authenticated
  USING (public.dm_group_can_view(id));

CREATE POLICY dm_group_members_participant_select
  ON public.dm_group_members FOR SELECT TO authenticated
  USING (
    status IN ('invited', 'accepted')
    AND (
      user_id = (SELECT auth.uid())
      OR public.dm_group_is_accepted_member(group_id)
    )
  );

-- Read-only client grants. All group membership writes must go through RPCs.
GRANT SELECT ON TABLE
  public.dm_group_conversations,
  public.dm_group_members
TO authenticated;

-- Create one group with 2-9 invited mutual followers (3-10 total slots).
-- Serialize creation/invitation rate limits by authenticated sender.
CREATE FUNCTION public.dm_group_create(p_name text, p_invitee_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text := btrim(p_name);
  v_invitee_count int := COALESCE(cardinality(p_invitee_ids), 0);
  v_group_id uuid;
  v_now timestamptz := clock_timestamp();
  v_invitee uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_name IS NULL OR char_length(v_name) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Group name must be between 1 and 80 characters';
  END IF;
  IF public.contains_blocked_content(v_name) THEN
    RAISE EXCEPTION 'Group name contains disallowed content';
  END IF;
  IF v_invitee_count NOT BETWEEN 2 AND 9
     OR EXISTS (SELECT 1 FROM unnest(p_invitee_ids) AS u(id)
                WHERE u.id IS NULL OR u.id = v_user_id)
     OR (SELECT count(DISTINCT u.id) FROM unnest(p_invitee_ids) AS u(id)) <> v_invitee_count THEN
    RAISE EXCEPTION 'Select 2-9 distinct other people';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('top3-dm-group-actor:' || v_user_id::text)::bigint);
  IF (
    SELECT count(*) FROM public.dm_group_conversations c
    WHERE c.created_by = v_user_id
      AND c.created_at > v_now - interval '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many groups created; try again later';
  END IF;
  IF (
    SELECT count(*) FROM public.dm_group_members m
    WHERE m.invited_by = v_user_id
      AND m.invited_at > v_now - interval '24 hours'
  ) + v_invitee_count > 20 THEN
    RAISE EXCEPTION 'Too many invitations; try again later';
  END IF;

  FOREACH v_invitee IN ARRAY p_invitee_ids LOOP
    IF NOT public.dm_can_message(v_user_id, v_invitee) THEN
      RAISE EXCEPTION 'Group invitations require mutual follows and no blocks';
    END IF;
  END LOOP;

  -- Never place two users into the same group if either has blocked the other.
  IF EXISTS (
    WITH selected_users AS (
      SELECT v_user_id AS user_id
      UNION
      SELECT u.id FROM unnest(p_invitee_ids) AS u(id)
    )
    SELECT 1 FROM public.blocks b
    WHERE b.blocker_id IN (SELECT user_id FROM selected_users)
      AND b.blocked_user_id IN (SELECT user_id FROM selected_users)
  ) THEN
    RAISE EXCEPTION 'Cannot invite users with an existing block';
  END IF;

  INSERT INTO public.dm_group_conversations (name, created_by, created_at)
  VALUES (v_name, v_user_id, v_now)
  RETURNING id INTO v_group_id;

  INSERT INTO public.dm_group_members
    (group_id, user_id, invited_by, status, invited_at, joined_at, updated_at)
  VALUES (v_group_id, v_user_id, NULL, 'accepted', v_now, v_now, v_now);

  INSERT INTO public.dm_group_members
    (group_id, user_id, invited_by, status, invited_at, updated_at)
  SELECT v_group_id, u.id, v_user_id, 'invited', v_now, v_now
  FROM unnest(p_invitee_ids) AS u(id);

  RETURN v_group_id;
END;
$fn$;

-- Only the original creator (while still an accepted member) may add members
-- in v1. Declined/left participants cannot be silently re-invited.
CREATE FUNCTION public.dm_group_invite(p_group_id uuid, p_invitee_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_user_id uuid := auth.uid();
  v_creator_id uuid;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('top3-dm-group-actor:' || v_user_id::text)::bigint);

  SELECT c.created_by INTO v_creator_id
  FROM public.dm_group_conversations c
  WHERE c.id = p_group_id FOR UPDATE;

  IF NOT FOUND OR v_creator_id IS DISTINCT FROM v_user_id
     OR NOT EXISTS (
       SELECT 1 FROM public.dm_group_members m
       WHERE m.group_id = p_group_id AND m.user_id = v_user_id
         AND m.status = 'accepted'
     ) THEN
    RAISE EXCEPTION 'Group invitation unavailable';
  END IF;

  IF NOT public.dm_can_message(v_user_id, p_invitee_id) THEN
    RAISE EXCEPTION 'Group invitations require mutual follows and no blocks';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.dm_group_members m
    WHERE m.group_id = p_group_id AND m.user_id = p_invitee_id
  ) THEN
    RAISE EXCEPTION 'Person already invited or previously joined';
  END IF;
  IF (
    SELECT count(*) FROM public.dm_group_members m
    WHERE m.group_id = p_group_id
      AND m.status IN ('invited', 'accepted')
  ) >= 10 THEN
    RAISE EXCEPTION 'This group is full';
  END IF;
  IF (
    SELECT count(*) FROM public.dm_group_members m
    WHERE m.invited_by = v_user_id
      AND m.invited_at > v_now - interval '24 hours'
  ) >= 20 THEN
    RAISE EXCEPTION 'Too many invitations; try again later';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.dm_group_members m
    JOIN public.blocks b ON (
      (b.blocker_id = m.user_id AND b.blocked_user_id = p_invitee_id)
      OR (b.blocked_user_id = m.user_id AND b.blocker_id = p_invitee_id)
    )
    WHERE m.group_id = p_group_id AND m.status IN ('accepted', 'invited')
  ) THEN
    RAISE EXCEPTION 'Cannot invite users with an existing block';
  END IF;

  INSERT INTO public.dm_group_members
    (group_id, user_id, invited_by, status, invited_at, updated_at)
  VALUES (p_group_id, p_invitee_id, v_user_id, 'invited', v_now, v_now);
END;
$fn$;

-- Only the invited account can accept/decline. Recheck blocks and mutual
-- follows at acceptance because relationships can change after invitation.
CREATE FUNCTION public.dm_group_respond_invitation(p_group_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_user_id uuid := auth.uid();
  v_inviter_id uuid;
  v_status text;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_accept IS NULL THEN
    RAISE EXCEPTION 'Choose accept or decline';
  END IF;

  -- Serialize against membership changes and group invitations.
  PERFORM 1 FROM public.dm_group_conversations c
  WHERE c.id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation unavailable';
  END IF;

  SELECT m.invited_by, m.status INTO v_inviter_id, v_status
  FROM public.dm_group_members m
  WHERE m.group_id = p_group_id AND m.user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND OR v_status <> 'invited' THEN
    RAISE EXCEPTION 'Invitation unavailable';
  END IF;

  IF p_accept THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.dm_group_members m
      WHERE m.group_id = p_group_id AND m.user_id = v_inviter_id
        AND m.status = 'accepted'
    ) OR NOT public.dm_can_message(v_inviter_id, v_user_id) THEN
      RAISE EXCEPTION 'Invitation no longer eligible';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.dm_group_members m
      JOIN public.blocks b ON (
        (b.blocker_id = m.user_id AND b.blocked_user_id = v_user_id)
        OR (b.blocked_user_id = m.user_id AND b.blocker_id = v_user_id)
      )
      WHERE m.group_id = p_group_id AND m.status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'Cannot join while a member is blocked';
    END IF;

    UPDATE public.dm_group_members m
    SET status = 'accepted', joined_at = v_now, updated_at = v_now
    WHERE m.group_id = p_group_id AND m.user_id = v_user_id;
  ELSE
    UPDATE public.dm_group_members m
    SET status = 'declined', joined_at = NULL, updated_at = v_now
    WHERE m.group_id = p_group_id AND m.user_id = v_user_id;
  END IF;
END;
$fn$;

-- Members can leave on their own. A former member loses group/roster access;
-- future message RLS must also require accepted membership.
CREATE FUNCTION public.dm_group_leave(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  PERFORM 1 FROM public.dm_group_conversations c
  WHERE c.id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group unavailable';
  END IF;

  UPDATE public.dm_group_members m
  SET status = 'left', updated_at = v_now
  WHERE m.group_id = p_group_id
    AND m.user_id = v_user_id AND m.status = 'accepted';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group unavailable';
  END IF;

  DELETE FROM public.dm_group_read_states rs
  WHERE rs.group_id = p_group_id AND rs.user_id = v_user_id;
END;
$fn$;

REVOKE ALL ON FUNCTION
  public.dm_group_create(text,uuid[]),
  public.dm_group_invite(uuid,uuid),
  public.dm_group_respond_invitation(uuid,boolean),
  public.dm_group_leave(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.dm_group_create(text,uuid[]),
  public.dm_group_invite(uuid,uuid),
  public.dm_group_respond_invitation(uuid,boolean),
  public.dm_group_leave(uuid)
TO authenticated;

COMMIT;
