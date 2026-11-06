-- Development feature test: render a saved banner through the actual Home
-- campaign RPC for its administrator only, without ever sending notifications.
-- Deploy ONLY to the DEVELOPMENT project. No draft or audience is broadcast.
BEGIN;

CREATE TABLE public.home_campaign_admin_tests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.home_campaign_admin_tests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.home_campaign_admin_tests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_campaign_admin_tests TO service_role;

CREATE FUNCTION public.activate_admin_home_banner_test(p_campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = v_user AND p.is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Administrator access required.';
  END IF;

  -- No scheduled, sent, cancelled, failed or third-party campaigns.
  IF NOT EXISTS (
    SELECT 1 FROM public.notification_campaigns AS c
    WHERE c.id = p_campaign_id
      AND c.created_by = v_user
      AND c.status = 'draft'
      AND c.home_banner_enabled IS TRUE
      AND c.title <> '' AND c.message <> ''
      AND c.home_banner_title IS NOT NULL
      AND btrim(c.home_banner_title) <> ''
      AND c.home_banner_message IS NOT NULL
      AND btrim(c.home_banner_message) <> ''
  ) THEN
    RAISE EXCEPTION 'Save your own enabled Home banner campaign as a draft before testing.';
  END IF;

  INSERT INTO public.home_campaign_admin_tests AS t
    (user_id, campaign_id, expires_at, created_at)
  VALUES (v_user, p_campaign_id, now() + interval '30 minutes', now())
  ON CONFLICT (user_id) DO UPDATE SET
    campaign_id = EXCLUDED.campaign_id,
    expires_at = EXCLUDED.expires_at,
    created_at = EXCLUDED.created_at;
  RETURN true;
END;
$$;

-- Exactly the same RPC shape used by Home today. Preview records are
-- considered first only for their owner and only while that owner is an
-- administrator; ordinary users continue to see only sent broadcasts.
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
  WITH admin_test AS (
    SELECT c.id AS campaign_id,
           coalesce(nullif(btrim(c.home_banner_title), ''), c.title) AS title,
           coalesce(nullif(btrim(c.home_banner_message), ''), c.message) AS message,
           c.category_id, c.destination_kind, c.option_id, t.expires_at
    FROM public.home_campaign_admin_tests AS t
    JOIN public.notification_campaigns AS c ON c.id = t.campaign_id
    WHERE t.user_id = auth.uid()
      AND t.expires_at > now()
      AND c.created_by = auth.uid()
      AND c.status = 'draft'
      AND c.home_banner_enabled = true
      AND EXISTS (
        SELECT 1 FROM public.profiles AS p
        WHERE p.id = auth.uid() AND p.is_admin IS TRUE
      )
      AND (
        c.destination_kind IN ('overall', 'genre')
        OR EXISTS (
          SELECT 1 FROM public.collection_options AS co
          WHERE co.id::text = c.option_id AND co.category_id::text = c.category_id
            AND co.kind::text = c.destination_kind AND co.active = true
        )
      )
    LIMIT 1
  ),
  latest_live AS (
    SELECT c.*
    FROM public.notification_campaigns AS c
    WHERE auth.uid() IS NOT NULL
      AND c.home_banner_enabled = true
      AND c.audience = 'all' AND c.status = 'sent'
      AND c.home_banner_activated_at IS NOT NULL
      AND c.home_banner_activated_at <= now()
      AND c.home_banner_activated_at + make_interval(hours => c.home_banner_duration_hours) > now()
      AND (
        c.destination_kind IN ('overall', 'genre')
        OR EXISTS (
          SELECT 1 FROM public.collection_options AS co
          WHERE co.id::text = c.option_id AND co.category_id::text = c.category_id
            AND co.kind::text = c.destination_kind AND co.active = true
        )
      )
    ORDER BY c.home_banner_activated_at DESC, c.id DESC
    LIMIT 1
  ),
  live_banner AS (
    SELECT c.id AS campaign_id,
           coalesce(nullif(btrim(c.home_banner_title), ''), c.title) AS title,
           coalesce(nullif(btrim(c.home_banner_message), ''), c.message) AS message,
           c.category_id, c.destination_kind, c.option_id,
           c.home_banner_activated_at + make_interval(hours => c.home_banner_duration_hours) AS expires_at
    FROM latest_live AS c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.home_campaign_banner_dismissals AS d
      WHERE d.user_id = auth.uid() AND d.campaign_id = c.id
    )
  )
  SELECT b.campaign_id, b.title, b.message, b.category_id,
         b.destination_kind, b.option_id, b.expires_at
  FROM (
    SELECT 0 AS priority, t.* FROM admin_test AS t
    UNION ALL
    SELECT 1 AS priority, l.* FROM live_banner AS l
  ) AS b
  ORDER BY b.priority
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_home_campaign_banner(p_campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  -- Dismissing the private admin test does not touch normal dismissals.
  DELETE FROM public.home_campaign_admin_tests AS t
  WHERE t.user_id = auth.uid()
    AND t.campaign_id = p_campaign_id
    AND t.expires_at > now();
  IF FOUND THEN RETURN true; END IF;

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

REVOKE ALL ON FUNCTION public.activate_admin_home_banner_test(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_admin_home_banner_test(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_active_home_campaign_banner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_home_campaign_banner() TO authenticated;
REVOKE ALL ON FUNCTION public.dismiss_home_campaign_banner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_home_campaign_banner(uuid) TO authenticated;
COMMIT;
