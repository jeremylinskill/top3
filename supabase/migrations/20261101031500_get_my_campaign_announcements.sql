-- Top 3: retrieve in-app campaign announcement content securely.
-- Development first. Read-only function; does not create notifications or send pushes.
BEGIN;

CREATE FUNCTION public.get_my_campaign_announcements()
RETURNS TABLE (
  notification_id uuid,
  campaign_id uuid,
  title text,
  message text,
  destination_kind text,
  category_id text,
  option_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    n.id AS notification_id,
    c.id AS campaign_id,
    c.title,
    c.message,
    c.destination_kind,
    c.category_id,
    c.option_id
  FROM public.notifications AS n
  JOIN public.notification_campaigns AS c ON c.id = n.campaign_id
  WHERE n.recipient_user_id = (SELECT auth.uid())
    AND n.type = 'announcement'
    AND (SELECT auth.uid()) IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_my_campaign_announcements() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_campaign_announcements() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_campaign_announcements() TO authenticated;

COMMIT;
