-- Top 3: in-app campaign announcements (schema only)
-- Development first. No announcement fan-out or push sending in this migration.
BEGIN;

-- Fail clearly if a future migration or manual change has already introduced this field.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'campaign_id'
  ) THEN
    RAISE EXCEPTION 'STOP: public.notifications.campaign_id already exists; inspect schema before proceeding';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass AND conname = 'notifications_type_check'
  ) THEN
    RAISE EXCEPTION 'STOP: expected notifications_type_check missing; inspect schema before proceeding';
  END IF;
END $$;

ALTER TABLE public.notifications
  ADD COLUMN campaign_id uuid REFERENCES public.notification_campaigns(id) ON DELETE RESTRICT;

-- Announcements represent system actions, not actions by an individual user.
ALTER TABLE public.notifications ALTER COLUMN actor_user_id DROP NOT NULL;

-- Retain every previously permitted notification type.
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'like'::text, 'comment'::text, 'comment_reply'::text,
    'follow'::text, 'follow_request_accepted'::text, 'announcement'::text
  ]));

-- Keep announcement rows distinguishable from existing social notification rows.
ALTER TABLE public.notifications ADD CONSTRAINT notifications_announcement_shape_check
  CHECK (
    (type = 'announcement' AND campaign_id IS NOT NULL AND actor_user_id IS NULL)
    OR
    (type <> 'announcement' AND campaign_id IS NULL AND actor_user_id IS NOT NULL)
  );

-- One in-app announcement per campaign per recipient, even if a worker retries.
CREATE UNIQUE INDEX notifications_one_announcement_per_recipient_campaign_idx
  ON public.notifications (recipient_user_id, campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_recipient_created_at_idx
  ON public.notifications (recipient_user_id, created_at DESC);

COMMIT;
