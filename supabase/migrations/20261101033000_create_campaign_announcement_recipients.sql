-- Top 3: guarded server-side in-app announcement recipient creation.
-- No triggers, scheduler, push requests, or automatic invocation.
-- Development first; service_role only.
BEGIN;

-- Persist the first authorized delivery mode per campaign. A canary campaign
-- must never be reused to create full-audience in-app announcements.
CREATE TABLE public.campaign_announcement_delivery_modes (
  campaign_id uuid PRIMARY KEY REFERENCES public.notification_campaigns(id) ON DELETE RESTRICT,
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('canary', 'full')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_announcement_delivery_modes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.campaign_announcement_delivery_modes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.campaign_announcement_delivery_modes TO service_role;

CREATE FUNCTION public.create_campaign_announcement_recipients(
  p_campaign_id uuid,
  p_mode text,
  p_canary_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_campaign record;
  v_eligible_count integer;
  v_inserted_count integer;
  v_persisted_mode text;
BEGIN
  IF p_campaign_id IS NULL OR p_mode NOT IN ('canary', 'full') OR p_mode IS NULL THEN
    RAISE EXCEPTION 'Invalid campaign or explicit delivery mode required';
  END IF;

  -- Only an already-claimed, valid all-audience campaign can be fanned out.
  SELECT id, audience, status, created_by, title, message, category_id, destination_kind, option_id
  INTO v_campaign
  FROM public.notification_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND OR v_campaign.audience <> 'all' OR v_campaign.status <> 'sending'
     OR v_campaign.created_by IS NULL OR NULLIF(btrim(v_campaign.title), '') IS NULL
     OR NULLIF(btrim(v_campaign.message), '') IS NULL
     OR v_campaign.category_id IS NULL OR v_campaign.destination_kind IS NULL THEN
    RAISE EXCEPTION 'Campaign is not an eligible claimed broadcast';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_campaign.created_by AND p.is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Campaign creator is not an administrator';
  END IF;

  -- This lock survives retries and prevents the same campaign from changing
  -- from canary to full or vice versa. The campaign row is locked above.
  INSERT INTO public.campaign_announcement_delivery_modes (campaign_id, delivery_mode)
  VALUES (p_campaign_id, p_mode)
  ON CONFLICT (campaign_id) DO NOTHING;

  SELECT delivery_mode INTO v_persisted_mode
  FROM public.campaign_announcement_delivery_modes
  WHERE campaign_id = p_campaign_id
  FOR UPDATE;

  IF v_persisted_mode IS DISTINCT FROM p_mode THEN
    RAISE EXCEPTION 'STOP: Campaign delivery mode is locked to %, not %',
      v_persisted_mode, p_mode;
  END IF;

  IF p_mode = 'canary' THEN
    IF p_canary_user_id IS NULL OR p_canary_user_id <> v_campaign.created_by THEN
      RAISE EXCEPTION 'Canary recipient must match the campaign creator';
    END IF;
    SELECT count(*)::integer INTO v_eligible_count
    FROM auth.users u
    WHERE u.id = p_canary_user_id
      AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now())
      AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL);
  ELSE
    IF p_canary_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Full-audience requests cannot supply a canary user';
    END IF;
    SELECT count(*)::integer INTO v_eligible_count
    FROM auth.users u
    WHERE u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now())
      AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL);
  END IF;

  -- Hard limit avoids silent partial distribution and accidental large writes.
  IF v_eligible_count < 1 OR v_eligible_count > 500 THEN
    RAISE EXCEPTION 'Eligible audience must be between 1 and 500; found %', v_eligible_count;
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id, actor_user_id, type, campaign_id, is_read
  )
  SELECT u.id, NULL, 'announcement', p_campaign_id, false
  FROM auth.users u
  WHERE u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= now())
    AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL)
    AND (p_mode = 'full' OR u.id = p_canary_user_id)
  ON CONFLICT (recipient_user_id, campaign_id) WHERE campaign_id IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_campaign_announcement_recipients(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_campaign_announcement_recipients(uuid, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.create_campaign_announcement_recipients(uuid, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_campaign_announcement_recipients(uuid, text, uuid) TO service_role;

COMMIT;
