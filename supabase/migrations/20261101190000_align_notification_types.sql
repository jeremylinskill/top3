-- Top 3 notification type compatibility alignment.
-- Forward-only: Production already has comment_like and announcement;
-- Development adds comment_like without rewriting its applied announcement migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $verify$
DECLARE
  types text[];
BEGIN
  SELECT array_agg(DISTINCT type ORDER BY type) INTO types FROM public.notifications;
  IF EXISTS (SELECT 1 FROM public.notifications
             WHERE type NOT IN ('like', 'comment', 'comment_reply', 'comment_like',
                                'follow', 'follow_request_accepted', 'announcement')) THEN
    RAISE EXCEPTION 'STOP: Unknown notification type present; review before altering constraint';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
      WHERE conrelid='public.notifications'::regclass
        AND conname='notifications_type_check' AND contype='c' AND convalidated) <> 1 THEN
    RAISE EXCEPTION 'STOP: Exactly one validated notification type constraint expected';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
      WHERE conrelid='public.notifications'::regclass
        AND conname='notifications_announcement_shape_check' AND contype='c' AND convalidated) <> 1 THEN
    RAISE EXCEPTION 'STOP: Expected validated announcement shape constraint missing';
  END IF;
END;
$verify$;

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'like'::text, 'comment'::text, 'comment_reply'::text, 'comment_like'::text,
    'follow'::text, 'follow_request_accepted'::text, 'announcement'::text
  ]));
COMMIT;
