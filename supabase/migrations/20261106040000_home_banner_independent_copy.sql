-- Store optional, independently editable Home banner copy. Existing campaigns
-- continue using the notification text through the RPC fallback.
BEGIN;

ALTER TABLE public.notification_campaigns
  ADD COLUMN home_banner_title text,
  ADD COLUMN home_banner_message text;

ALTER TABLE public.notification_campaigns
  ADD CONSTRAINT notification_campaigns_home_banner_copy_length_check
  CHECK (
    (home_banner_title IS NULL OR char_length(home_banner_title) <= 100)
    AND (home_banner_message IS NULL OR char_length(home_banner_message) <= 220)
  );

CREATE OR REPLACE FUNCTION public.get_active_home_campaign_banner()
RETURNS TABLE (
  campaign_id uuid,
  title text,
  message text,
  category_id text,
  destination_kind text,
  option_id text,
  expires_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH latest AS (
    SELECT nc.*
    FROM public.notification_campaigns AS nc
    WHERE auth.uid() IS NOT NULL
      AND nc.home_banner_enabled = true
      AND nc.audience = 'all'
      AND nc.status = 'sent'
      AND nc.home_banner_activated_at IS NOT NULL
      AND nc.home_banner_activated_at <= now()
      AND nc.home_banner_activated_at + make_interval(hours => nc.home_banner_duration_hours) > now()
      AND (
        nc.destination_kind IN ('overall', 'genre')
        OR EXISTS (
          SELECT 1 FROM public.collection_options AS co
          WHERE co.id::text = nc.option_id AND co.category_id::text = nc.category_id
            AND co.kind::text = nc.destination_kind AND co.active = true
        )
      )
    ORDER BY nc.home_banner_activated_at DESC, nc.id DESC
    LIMIT 1
  )
  SELECT nc.id,
         coalesce(nullif(btrim(nc.home_banner_title), ''), nc.title),
         coalesce(nullif(btrim(nc.home_banner_message), ''), nc.message),
         nc.category_id, nc.destination_kind, nc.option_id,
         nc.home_banner_activated_at + make_interval(hours => nc.home_banner_duration_hours)
  FROM latest AS nc
  WHERE NOT EXISTS (
    SELECT 1 FROM public.home_campaign_banner_dismissals AS d
    WHERE d.user_id = auth.uid() AND d.campaign_id = nc.id
  );
$$;

-- Preserve administrator-only database access to campaign rows.
REVOKE ALL ON FUNCTION public.get_active_home_campaign_banner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_home_campaign_banner() TO authenticated;
COMMIT;
