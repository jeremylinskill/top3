-- Top 3 | Reconcile standard comment-like schema across environments.
-- Development currently lacks public.comment_likes, which Production contains.
-- Production has two existing likes: this migration MUST preserve both.
-- Additive/idempotent: NO deletes, truncates, data copies, or table replacement.
-- Intended sequence: install locally, review; deploy/test Development first;
--                   review Production preflight and deploy there separately.
BEGIN;

DO $guard$
DECLARE
  actual_cols integer;
  matching_cols integer;
  actual_constraints integer;
  matching_constraints integer;
BEGIN
  IF to_regclass('public.comments') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.collections') IS NULL
     OR to_regprocedure('public.can_view_published_collection(uuid)') IS NULL
  THEN
    RAISE EXCEPTION 'STOP: Required comment-likes dependencies are missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='comments'
      AND column_name='reply_to_comment_id'
  ) THEN
    RAISE EXCEPTION 'STOP: comments.reply_to_comment_id is missing.';
  END IF;

  IF to_regclass('public.comment_likes') IS NULL THEN
    CREATE TABLE public.comment_likes (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      comment_id uuid NOT NULL,
      user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
      CONSTRAINT comment_likes_user_comment_unique UNIQUE (user_id, comment_id),
      CONSTRAINT comment_likes_comment_id_fkey
        FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE,
      CONSTRAINT comment_likes_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
    );
  ELSE
    -- Do not quietly treat an unrelated or drifting table as equivalent.
    SELECT COUNT(*) INTO actual_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comment_likes';

    SELECT COUNT(*) INTO matching_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comment_likes'
      AND (
        (column_name = 'id' AND data_type = 'uuid' AND is_nullable = 'NO'
         AND column_default = 'gen_random_uuid()') OR
        (column_name = 'comment_id' AND data_type = 'uuid' AND is_nullable = 'NO'
         AND column_default IS NULL) OR
        (column_name = 'user_id' AND data_type = 'uuid' AND is_nullable = 'NO'
         AND column_default IS NULL) OR
        (column_name = 'created_at' AND data_type = 'timestamp with time zone'
         AND is_nullable = 'NO' AND column_default = 'now()')
      );

    IF actual_cols <> 4 OR matching_cols <> 4 THEN
      RAISE EXCEPTION 'STOP: Existing comment_likes columns do not match the reviewed Production schema.';
    END IF;

    SELECT COUNT(*) INTO actual_constraints FROM pg_constraint
    WHERE conrelid = 'public.comment_likes'::regclass;

    SELECT COUNT(*) INTO matching_constraints FROM pg_constraint
    WHERE conrelid = 'public.comment_likes'::regclass
      AND (
        (conname='comment_likes_pkey' AND contype='p'
         AND pg_get_constraintdef(oid)='PRIMARY KEY (id)') OR
        (conname='comment_likes_user_comment_unique' AND contype='u'
         AND pg_get_constraintdef(oid)='UNIQUE (user_id, comment_id)') OR
        (conname='comment_likes_comment_id_fkey' AND contype='f'
         AND pg_get_constraintdef(oid)='FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE') OR
        (conname='comment_likes_user_id_fkey' AND contype='f'
         AND pg_get_constraintdef(oid)='FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE')
      );

    IF actual_constraints <> 4 OR matching_constraints <> 4 THEN
      RAISE EXCEPTION 'STOP: Existing comment_likes constraints do not match Production.';
    END IF;
  END IF;
END;
$guard$;

CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx
  ON public.comment_likes USING btree (comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx
  ON public.comment_likes USING btree (user_id);
CREATE INDEX IF NOT EXISTS comments_reply_to_comment_id_idx
  ON public.comments USING btree (reply_to_comment_id)
  WHERE reply_to_comment_id IS NOT NULL;

-- Confirm that named indexes have precisely the reviewed definitions, not
-- merely matching names (IF NOT EXISTS alone would not detect index drift).
DO $indexes$
DECLARE
  num_matching integer;
BEGIN
  SELECT COUNT(*) INTO num_matching
  FROM pg_indexes
  WHERE schemaname='public'
    AND (
      (tablename='comment_likes' AND indexname='comment_likes_comment_id_idx'
       AND indexdef='CREATE INDEX comment_likes_comment_id_idx ON public.comment_likes USING btree (comment_id)') OR
      (tablename='comment_likes' AND indexname='comment_likes_user_id_idx'
       AND indexdef='CREATE INDEX comment_likes_user_id_idx ON public.comment_likes USING btree (user_id)') OR
      (tablename='comment_likes' AND indexname='comment_likes_pkey'
       AND indexdef='CREATE UNIQUE INDEX comment_likes_pkey ON public.comment_likes USING btree (id)') OR
      (tablename='comment_likes' AND indexname='comment_likes_user_comment_unique'
       AND indexdef='CREATE UNIQUE INDEX comment_likes_user_comment_unique ON public.comment_likes USING btree (user_id, comment_id)') OR
      (tablename='comments' AND indexname='comments_reply_to_comment_id_idx'
       AND indexdef='CREATE INDEX comments_reply_to_comment_id_idx ON public.comments USING btree (reply_to_comment_id) WHERE (reply_to_comment_id IS NOT NULL)')
    );

  IF num_matching <> 5 THEN
    RAISE EXCEPTION 'STOP: Expected comment-like/reply index definitions do not match.';
  END IF;
END;
$indexes$;

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DO $policies$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='comment_likes'
      AND policyname='Users can delete their own comment likes'
  ) THEN
    CREATE POLICY "Users can delete their own comment likes"
      ON public.comment_likes FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='comment_likes'
      AND policyname='Users can like comments on visible published collections'
  ) THEN
    CREATE POLICY "Users can like comments on visible published collections"
      ON public.comment_likes FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id AND EXISTS (
          SELECT 1 FROM public.comments c
          JOIN public.collections col ON col.id = c.collection_id
          WHERE c.id = comment_likes.comment_id
            AND c.removed_at IS NULL
            AND col.status = 'published'::text
            AND col.published_at IS NOT NULL
            AND col.removed_at IS NULL
            AND public.can_view_published_collection(col.user_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='comment_likes'
      AND policyname='Users can read comment likes on visible published collections'
  ) THEN
    CREATE POLICY "Users can read comment likes on visible published collections"
      ON public.comment_likes FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.comments c
          JOIN public.collections col ON col.id = c.collection_id
          WHERE c.id = comment_likes.comment_id
            AND c.removed_at IS NULL
            AND col.status = 'published'::text
            AND col.published_at IS NOT NULL
            AND col.removed_at IS NULL
            AND public.can_view_published_collection(col.user_id)
        )
      );
  END IF;
END;
$policies$;

GRANT SELECT, INSERT, DELETE ON TABLE public.comment_likes TO authenticated;

-- Fail closed on missing/extra policies. Existing policies are not replaced;
-- a separate reviewed migration is needed if they drift.
DO $verify$
DECLARE
  policy_count integer;
  expected_count integer;
  rls_on boolean;
BEGIN
  SELECT relrowsecurity INTO rls_on
  FROM pg_class WHERE oid='public.comment_likes'::regclass;

  SELECT COUNT(*) INTO policy_count FROM pg_policies
  WHERE schemaname='public' AND tablename='comment_likes';

  SELECT COUNT(*) INTO expected_count FROM pg_policies
  WHERE schemaname='public' AND tablename='comment_likes'
    AND roles=ARRAY['authenticated']::name[]
    AND (
      (policyname='Users can delete their own comment likes' AND cmd='DELETE') OR
      (policyname='Users can like comments on visible published collections' AND cmd='INSERT') OR
      (policyname='Users can read comment likes on visible published collections' AND cmd='SELECT')
    );

  IF NOT rls_on OR policy_count<>3 OR expected_count<>3 THEN
    RAISE EXCEPTION 'STOP: comment_likes RLS policy set is not the expected three authenticated policies.';
  END IF;
END;
$verify$;

COMMIT;
