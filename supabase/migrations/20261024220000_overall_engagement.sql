-- Top 3: Overall engagement schema and permissions.
-- Prepared 2026-10-24 from Top3 - Dev schema/security inspection.
-- STAGED FOR REVIEW ONLY: do not run supabase db push or deploy this
-- migration until it has been tested in a disposable environment and approved.
-- This creates tables: community_ranking_likes, community_ranking_comments,
-- community_ranking_comment_likes, community_ranking_comment_reports.
-- Important: This script expects public.profiles(id) and auth.users(id) to exist.
-- It intentionally fails if any of these new tables already exist, to prevent
-- silently treating an unexpected/partial schema as successfully migrated.
-- Comment edits are limited to content and updated_at to prevent moving
-- an existing comment between rankings or changing reply/user identities.

BEGIN;

CREATE TABLE public.community_ranking_likes (
  ranking_key text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_ranking_likes_pkey PRIMARY KEY (user_id, ranking_key),
  CONSTRAINT community_ranking_likes_ranking_key_check
    CHECK (left(ranking_key, 10) = 'community-' AND length(ranking_key) BETWEEN 11 AND 300),
  CONSTRAINT community_ranking_likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.community_ranking_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ranking_key text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  reply_to_comment_id uuid,
  reply_to_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  CONSTRAINT community_ranking_comments_pkey PRIMARY KEY (id),
  CONSTRAINT community_ranking_comments_ranking_key_check
    CHECK (left(ranking_key, 10) = 'community-' AND length(ranking_key) BETWEEN 11 AND 300),
  CONSTRAINT community_ranking_comments_content_check
    CHECK (length(btrim(content)) BETWEEN 1 AND 500),
  CONSTRAINT community_ranking_comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT community_ranking_comments_reply_to_user_id_fkey
    FOREIGN KEY (reply_to_user_id) REFERENCES public.profiles(id),
  CONSTRAINT community_ranking_comments_reply_to_comment_id_fkey
    FOREIGN KEY (reply_to_comment_id) REFERENCES public.community_ranking_comments(id)
    ON DELETE SET NULL
);

CREATE TABLE public.community_ranking_comment_likes (
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_ranking_comment_likes_pkey PRIMARY KEY (user_id, comment_id),
  CONSTRAINT community_ranking_comment_likes_comment_id_fkey
    FOREIGN KEY (comment_id) REFERENCES public.community_ranking_comments(id)
    ON DELETE CASCADE,
  CONSTRAINT community_ranking_comment_likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.community_ranking_comment_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reported_comment_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  CONSTRAINT community_ranking_comment_reports_pkey PRIMARY KEY (id),
  CONSTRAINT community_ranking_comment_rep_reporter_id_reported_comment__key
    UNIQUE (reporter_id, reported_comment_id),
  CONSTRAINT community_ranking_comment_reports_check
    CHECK (reporter_id <> reported_user_id),
  CONSTRAINT community_ranking_comment_reports_reason_check
    CHECK (length(btrim(reason)) BETWEEN 1 AND 100),
  CONSTRAINT community_ranking_comment_reports_status_check
    CHECK (status = ANY (ARRAY['pending','reviewed','dismissed','removed']::text[])),
  CONSTRAINT community_ranking_comment_reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT community_ranking_comment_reports_reported_user_id_fkey
    FOREIGN KEY (reported_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT community_ranking_comment_reports_reported_comment_id_fkey
    FOREIGN KEY (reported_comment_id) REFERENCES public.community_ranking_comments(id)
    ON DELETE CASCADE
);

-- Additional non-constraint indexes observed in Dev.
CREATE INDEX community_ranking_likes_key_idx
  ON public.community_ranking_likes (ranking_key);
CREATE INDEX community_ranking_comments_key_idx
  ON public.community_ranking_comments (ranking_key, created_at);
CREATE INDEX community_ranking_comments_reply_idx
  ON public.community_ranking_comments (reply_to_comment_id);
CREATE INDEX community_ranking_comment_reports_status_idx
  ON public.community_ranking_comment_reports (status, created_at);

-- The Dev trigger prevents replies from targeting another Overall ranking
-- and derives reply_to_user_id from the target comment itself.
-- Fail clearly rather than overwrite an unexpected existing production function.
DO $guard$
BEGIN
  IF to_regprocedure('public.set_community_ranking_reply_author()') IS NOT NULL THEN
    RAISE EXCEPTION 'Overall reply author trigger function already exists; inspect before applying migration';
  END IF;
END;
$guard$;

CREATE FUNCTION public.set_community_ranking_reply_author()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  reply_author uuid;
BEGIN
  IF NEW.reply_to_comment_id IS NULL THEN
    NEW.reply_to_user_id := NULL;
  ELSE
    SELECT c.user_id INTO reply_author
    FROM public.community_ranking_comments c
    WHERE c.id = NEW.reply_to_comment_id
      AND c.ranking_key = NEW.ranking_key
      AND c.removed_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Reply target must belong to the same Overall ranking';
    END IF;

    NEW.reply_to_user_id := reply_author;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER community_reply_author
BEFORE INSERT OR UPDATE OF reply_to_comment_id, ranking_key
ON public.community_ranking_comments
FOR EACH ROW EXECUTE FUNCTION public.set_community_ranking_reply_author();

-- Enforce RLS on all four tables, matching Dev's existing policies.
ALTER TABLE public.community_ranking_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_ranking_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_ranking_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_ranking_comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Like Overall as self" ON public.community_ranking_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Read Overall likes" ON public.community_ranking_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Unlike Overall as self" ON public.community_ranking_likes
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Write Overall comment as self" ON public.community_ranking_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND removed_at IS NULL);
CREATE POLICY "Read visible Overall comments" ON public.community_ranking_comments
  FOR SELECT TO authenticated
  USING (removed_at IS NULL OR user_id = (SELECT auth.uid()));
CREATE POLICY "Edit own Overall comment" ON public.community_ranking_comments
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND removed_at IS NULL)
  WITH CHECK (user_id = (SELECT auth.uid()) AND removed_at IS NULL);
CREATE POLICY "Delete own Overall comment" ON public.community_ranking_comments
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Like Overall comment as self" ON public.community_ranking_comment_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Read Overall comment likes" ON public.community_ranking_comment_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Unlike Overall comment as self" ON public.community_ranking_comment_likes
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Submit Overall comment reports" ON public.community_ranking_comment_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.community_ranking_comments c
      WHERE c.id = reported_comment_id
        AND c.user_id = reported_user_id
        AND c.removed_at IS NULL
    )
  );

-- Application-facing grants match Dev, except that authenticated comment edits
-- are intentionally limited to content and updated_at (security improvement).
REVOKE ALL ON TABLE
  public.community_ranking_likes,
  public.community_ranking_comments,
  public.community_ranking_comment_likes,
  public.community_ranking_comment_reports
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, DELETE ON public.community_ranking_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_ranking_comment_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_ranking_comments TO authenticated;
GRANT UPDATE (content, updated_at) ON public.community_ranking_comments TO authenticated;
GRANT INSERT ON public.community_ranking_comment_reports TO authenticated;
GRANT SELECT ON public.community_ranking_comments TO service_role;
GRANT UPDATE (removed_at) ON public.community_ranking_comments TO service_role;
GRANT SELECT ON public.community_ranking_comment_reports TO service_role;
GRANT UPDATE (status) ON public.community_ranking_comment_reports TO service_role;

-- Match Dev: publish likes, comment likes and comments, but NOT reports.
-- Adding tables does not publish user reports or change unrelated tables.
DO $publication$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'Expected Supabase publication supabase_realtime not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'community_ranking_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_ranking_likes;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'community_ranking_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_ranking_comments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'community_ranking_comment_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_ranking_comment_likes;
  END IF;
END;
$publication$;

COMMIT;
