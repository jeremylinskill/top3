-- Top 3: allow Podcasts as a destination in notification campaign history.
-- Scope: forward-only Development migration. No data updates, sends or schedule changes.
-- Preserve the previous category constraint exactly; add ONLY podcasts.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '45s';

DO $preflight$
DECLARE
  actual_definition text;
  expected_definition CONSTANT text := $expected$CHECK ((((status = 'draft'::text) AND (category_id IS NULL)) OR ((category_id IS NOT NULL) AND (category_id = ANY (ARRAY['albums'::text, 'artists'::text, 'books'::text, 'games'::text, 'movies'::text, 'songs'::text, 'tv'::text])))))$expected$;
BEGIN
  IF to_regclass('public.notification_campaigns') IS NULL THEN
    RAISE EXCEPTION 'STOP: public.notification_campaigns is missing';
  END IF;

  SELECT pg_get_constraintdef(c.oid)
    INTO actual_definition
    FROM pg_constraint c
    WHERE c.conrelid = 'public.notification_campaigns'::regclass
      AND c.conname = 'notification_campaigns_category_check'
      AND c.contype = 'c';

  IF actual_definition IS DISTINCT FROM expected_definition THEN
    RAISE EXCEPTION 'STOP: notification_campaigns_category_check differs from reviewed Development rule'
      USING DETAIL = coalesce(actual_definition, 'Constraint not found');
  END IF;
END;
$preflight$;

ALTER TABLE public.notification_campaigns
  DROP CONSTRAINT notification_campaigns_category_check;

ALTER TABLE public.notification_campaigns
  ADD CONSTRAINT notification_campaigns_category_check
  CHECK (
    ((status = 'draft'::text) AND (category_id IS NULL))
    OR
    ((category_id IS NOT NULL) AND
      (category_id = ANY (ARRAY[
        'albums'::text, 'artists'::text, 'books'::text,
        'games'::text, 'movies'::text, 'podcasts'::text,
        'songs'::text, 'tv'::text
      ])))
  );

DO $postflight$
DECLARE
  new_definition text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO new_definition
    FROM pg_constraint c
    WHERE c.conrelid = 'public.notification_campaigns'::regclass
      AND c.conname = 'notification_campaigns_category_check';

  IF new_definition IS NULL OR position('podcasts' IN new_definition) = 0 THEN
    RAISE EXCEPTION 'STOP: Podcasts category not present in campaign constraint after update';
  END IF;
END;
$postflight$;
COMMIT;
