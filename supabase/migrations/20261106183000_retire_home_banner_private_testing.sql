-- Top 3: Retire Development-only Home banner testing in the production release.
-- Forward-only follow-up to the already-applied Development migration
-- 20261106070000_admin_only_home_banner_test.sql.
-- DO NOT rewrite or delete that existing migration.
-- This migration also intentionally removes the private test from Development
-- if/when applied there; do not push until release staging is ready.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '45s';

DO $preflight$
BEGIN
  IF to_regclass('public.home_campaign_admin_tests') IS NULL OR
     to_regprocedure('public.activate_admin_home_banner_test(uuid)') IS NULL THEN
    RAISE EXCEPTION 'STOP: expected private Home banner test objects are absent';
  END IF;
  IF to_regprocedure('public.get_active_home_campaign_banner()') IS NULL OR
     to_regprocedure('public.dismiss_home_campaign_banner(uuid)') IS NULL THEN
    RAISE EXCEPTION 'STOP: expected public Home banner RPCs are absent';
  END IF;
  IF position('home_campaign_admin_tests' IN
      pg_get_functiondef('public.get_active_home_campaign_banner()'::regprocedure)) = 0 OR
     position('home_campaign_admin_tests' IN
      pg_get_functiondef('public.dismiss_home_campaign_banner(uuid)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'STOP: existing Home banner RPCs differ from reviewed Development test version';
  END IF;
END;
$preflight$;

-- Restore the independent Home banner copy and ordinary public-campaign reads.
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

-- Restore ordinary campaign-only dismissal, preserving existing dismissals.
CREATE OR REPLACE FUNCTION public.dismiss_home_campaign_banner(p_campaign_id uuid)
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

-- Remove the private test RPC and its associated records. No CASCADE:
-- unexpected dependencies must fail the migration rather than be dropped.
DROP FUNCTION public.activate_admin_home_banner_test(uuid);
DROP TABLE public.home_campaign_admin_tests;

REVOKE ALL ON FUNCTION public.get_active_home_campaign_banner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_home_campaign_banner() TO authenticated;
REVOKE ALL ON FUNCTION public.dismiss_home_campaign_banner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_home_campaign_banner(uuid) TO authenticated;

DO $postflight$
BEGIN
  IF to_regclass('public.home_campaign_admin_tests') IS NOT NULL OR
     to_regprocedure('public.activate_admin_home_banner_test(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: private Home banner testing objects remain';
  END IF;
  IF position('home_campaign_admin_tests' IN
      pg_get_functiondef('public.get_active_home_campaign_banner()'::regprocedure)) > 0 OR
     position('home_campaign_admin_tests' IN
      pg_get_functiondef('public.dismiss_home_campaign_banner(uuid)'::regprocedure)) > 0 THEN
    RAISE EXCEPTION 'STOP: public RPCs still reference the private test table';
  END IF;
END;
$postflight$;
COMMIT;
