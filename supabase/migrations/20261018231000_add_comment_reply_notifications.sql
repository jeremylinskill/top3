-- Add notifications for direct replies to Top 3 comments.
-- Originally applied directly to production Supabase.
-- Preserve existing notification types and avoid duplicate recipients.

BEGIN;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'like',
        'comment',
        'comment_reply',
        'follow',
        'follow_request_accepted'
      ]
    )
  );

CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  collection_owner_id uuid;
BEGIN
  SELECT user_id
  INTO collection_owner_id
  FROM public.collections
  WHERE id = NEW.collection_id;

  IF collection_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify the author of the original comment.
  IF NEW.reply_to_comment_id IS NOT NULL
     AND NEW.reply_to_user_id IS NOT NULL
     AND NEW.reply_to_user_id <> NEW.user_id
  THEN
    INSERT INTO public.notifications (
      recipient_user_id,
      actor_user_id,
      type,
      collection_id,
      comment_id
    )
    VALUES (
      NEW.reply_to_user_id,
      NEW.user_id,
      'comment_reply',
      NEW.collection_id,
      NEW.id
    );
  END IF;

  -- Notify the collection owner, unless they
  -- wrote the comment or are already receiving
  -- the direct-reply notification.
  IF collection_owner_id <> NEW.user_id
     AND collection_owner_id IS DISTINCT FROM
         NEW.reply_to_user_id
  THEN
    INSERT INTO public.notifications (
      recipient_user_id,
      actor_user_id,
      type,
      collection_id,
      comment_id
    )
    VALUES (
      collection_owner_id,
      NEW.user_id,
      'comment',
      NEW.collection_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
