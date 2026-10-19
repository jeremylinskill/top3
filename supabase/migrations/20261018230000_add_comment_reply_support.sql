-- Add support for replies to Top 3 comments.
-- These changes were originally applied directly in Supabase.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS reply_to_comment_id uuid,
  ADD COLUMN IF NOT EXISTS reply_to_user_id uuid;

-- Preserve the existing foreign key relationships.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.comments'::regclass
      AND conname = 'comments_reply_to_comment_id_fkey'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_reply_to_comment_id_fkey
      FOREIGN KEY (reply_to_comment_id)
      REFERENCES public.comments(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.comments'::regclass
      AND conname = 'comments_reply_to_user_id_fkey'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_reply_to_user_id_fkey
      FOREIGN KEY (reply_to_user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- Identify the author of the comment being replied to.
CREATE OR REPLACE FUNCTION public.set_comment_reply_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  parent_user_id uuid;
  parent_collection_id uuid;
BEGIN
  IF NEW.reply_to_comment_id IS NULL THEN
    NEW.reply_to_user_id := NULL;
    RETURN NEW;
  END IF;

  SELECT user_id, collection_id
  INTO parent_user_id, parent_collection_id
  FROM public.comments
  WHERE id = NEW.reply_to_comment_id
    AND removed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reply target comment not found';
  END IF;

  IF parent_collection_id <> NEW.collection_id THEN
    RAISE EXCEPTION 'Reply must belong to the same collection';
  END IF;

  NEW.reply_to_user_id := parent_user_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_comment_reply_user_trigger
ON public.comments;

CREATE TRIGGER set_comment_reply_user_trigger
BEFORE INSERT OR UPDATE OF reply_to_comment_id, collection_id
ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.set_comment_reply_user();
