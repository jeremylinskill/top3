-- Top 3: Development-first account-deletion foreign-key correction.
-- Safely clean up the deleting author's own community-ranking comments,
-- while retaining other users' comments by nulling replies to that account.
-- Existing rows are not deleted or updated by applying this migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $verify_before$
DECLARE
    author_attnum smallint;
    reply_attnum smallint;
    profile_id_attnum smallint;
BEGIN
    SELECT attnum INTO STRICT author_attnum
      FROM pg_attribute
     WHERE attrelid = 'public.community_ranking_comments'::regclass
       AND attname = 'user_id' AND NOT attisdropped;
    SELECT attnum INTO STRICT reply_attnum
      FROM pg_attribute
     WHERE attrelid = 'public.community_ranking_comments'::regclass
       AND attname = 'reply_to_user_id' AND NOT attisdropped;
    SELECT attnum INTO STRICT profile_id_attnum
      FROM pg_attribute
     WHERE attrelid = 'public.profiles'::regclass
       AND attname = 'id' AND NOT attisdropped;

    IF EXISTS (
        SELECT 1 FROM pg_attribute
         WHERE attrelid = 'public.community_ranking_comments'::regclass
           AND attname = 'reply_to_user_id' AND attnotnull
    ) THEN
        RAISE EXCEPTION 'STOP: reply_to_user_id unexpectedly NOT NULL';
    END IF;

    IF (SELECT count(*) FROM pg_constraint
         WHERE conrelid = 'public.community_ranking_comments'::regclass
           AND confrelid = 'public.profiles'::regclass
           AND contype = 'f'
           AND convalidated
           AND confdeltype = 'a'
           AND (
              (conname = 'community_ranking_comments_user_id_fkey'
               AND conkey = ARRAY[author_attnum]::smallint[]
               AND confkey = ARRAY[profile_id_attnum]::smallint[])
              OR
              (conname = 'community_ranking_comments_reply_to_user_id_fkey'
               AND conkey = ARRAY[reply_attnum]::smallint[]
               AND confkey = ARRAY[profile_id_attnum]::smallint[])
           )
    ) <> 2 THEN
        RAISE EXCEPTION 'STOP: Existing community comment foreign keys differ from reviewed Development schema';
    END IF;

    -- Block schema surprises: exactly these two FKs may reference profiles.
    IF (SELECT count(*) FROM pg_constraint
         WHERE conrelid = 'public.community_ranking_comments'::regclass
           AND confrelid = 'public.profiles'::regclass
           AND contype = 'f') <> 2 THEN
        RAISE EXCEPTION 'STOP: Unexpected additional community comment to profile foreign key';
    END IF;
END;
$verify_before$;

ALTER TABLE public.community_ranking_comments
    DROP CONSTRAINT community_ranking_comments_user_id_fkey;
ALTER TABLE public.community_ranking_comments
    ADD CONSTRAINT community_ranking_comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.community_ranking_comments
    DROP CONSTRAINT community_ranking_comments_reply_to_user_id_fkey;
ALTER TABLE public.community_ranking_comments
    ADD CONSTRAINT community_ranking_comments_reply_to_user_id_fkey
    FOREIGN KEY (reply_to_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $verify_after$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.community_ranking_comments'::regclass
          AND conname = 'community_ranking_comments_user_id_fkey'
          AND confdeltype = 'c' AND convalidated
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.community_ranking_comments'::regclass
          AND conname = 'community_ranking_comments_reply_to_user_id_fkey'
          AND confdeltype = 'n' AND convalidated
    ) THEN
        RAISE EXCEPTION 'STOP: New account-deletion rules did not validate';
    END IF;
END;
$verify_after$;
COMMIT;
