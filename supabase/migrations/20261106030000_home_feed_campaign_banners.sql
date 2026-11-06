-- Home feed banners linked to verified, full-audience campaign sends.
-- New fields default off: all existing campaigns remain unchanged.
BEGIN;

ALTER TABLE public.notification_campaigns
  ADD COLUMN home_banner_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN home_banner_duration_hours integer NOT NULL DEFAULT 72,
  ADD COLUMN home_banner_activated_at timestamptz;

ALTER TABLE public.notification_campaigns
  ADD CONSTRAINT notification_campaigns_home_banner_duration_check
  CHECK (home_banner_duration_hours IN (24, 72, 168));

ALTER TABLE public.notification_campaigns
  ADD CONSTRAINT notification_campaigns_home_banner_audience_check
  CHECK (home_banner_enabled = false OR status = 'draft' OR audience = 'all');

-- Protect against accidental activation on tests or unfinished campaigns.
ALTER TABLE public.notification_campaigns
  ADD CONSTRAINT notification_campaigns_home_banner_activation_check
  CHECK (
    home_banner_activated_at IS NULL OR
    (home_banner_enabled = true AND audience = 'all' AND status = 'sent'
      AND sent_at IS NOT NULL)
  );

CREATE INDEX notification_campaigns_active_home_banner_idx
  ON public.notification_campaigns(home_banner_activated_at DESC, id DESC)
  WHERE home_banner_enabled = true AND audience = 'all' AND status = 'sent';

CREATE TABLE public.home_campaign_banner_dismissals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_id)
);

ALTER TABLE public.home_campaign_banner_dismissals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.home_campaign_banner_dismissals FROM anon, authenticated;

-- Return only campaign copy and destination, never devices, audience counts,
-- draft content, or other administrator-only campaign details.
CREATE FUNCTION public.get_active_home_campaign_banner()
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
  SELECT nc.id, nc.title, nc.message, nc.category_id,
         nc.destination_kind, nc.option_id,
         nc.home_banner_activated_at + make_interval(hours => nc.home_banner_duration_hours)
  FROM latest AS nc
  WHERE NOT EXISTS (
    SELECT 1 FROM public.home_campaign_banner_dismissals AS d
    WHERE d.user_id = auth.uid() AND d.campaign_id = nc.id
  );
$$;

CREATE FUNCTION public.dismiss_home_campaign_banner(p_campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.notification_campaigns AS nc
    WHERE nc.id = p_campaign_id
      AND nc.audience = 'all' AND nc.status = 'sent'
      AND nc.home_banner_enabled = true AND nc.home_banner_activated_at IS NOT NULL
      AND nc.home_banner_activated_at + make_interval(hours => nc.home_banner_duration_hours) > now()
  ) THEN RETURN false; END IF;
  INSERT INTO public.home_campaign_banner_dismissals(user_id, campaign_id)
  VALUES (auth.uid(), p_campaign_id)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_home_campaign_banner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_home_campaign_banner() TO authenticated;
REVOKE ALL ON FUNCTION public.dismiss_home_campaign_banner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_home_campaign_banner(uuid) TO authenticated;
COMMIT;
