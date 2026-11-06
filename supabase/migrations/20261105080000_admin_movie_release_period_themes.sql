-- DEVELOPMENT FIRST: strictly scoped release-period Movie Theme admin functions.
-- No existing catalogue rows, user lists, or curated suggestions are rewritten by this migration.
-- Primary release date is an inclusive range; the app's search/suggestions already support it.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE FUNCTION public.admin_update_movie_release_period_theme(
  p_id text,
  p_details jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.collection_options%ROWTYPE;
  v_title text;
  v_description text;
  v_start text;
  v_end text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_details) IS DISTINCT FROM 'object'
    OR (p_details - 'displayTitle' - 'description' - 'startDate' - 'endDate') <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid release-period edit fields';
  END IF;
  IF jsonb_typeof(p_details->'displayTitle') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_details->'description') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_details->'startDate') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_details->'endDate') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'Release-period fields must be strings';
  END IF;
  v_title := btrim(p_details->>'displayTitle');
  v_description := btrim(p_details->>'description');
  v_start := btrim(p_details->>'startDate');
  v_end := btrim(p_details->>'endDate');
  IF length(v_title) NOT BETWEEN 4 AND 120 THEN RAISE EXCEPTION 'Invalid list title'; END IF;
  IF length(v_description) > 180 THEN RAISE EXCEPTION 'Description too long'; END IF;
  IF v_start !~ '^(18|19|20|21)[0-9]{2}-[0-9]{2}-[0-9]{2}$'
    OR v_end !~ '^(18|19|20|21)[0-9]{2}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Both release dates must use YYYY-MM-DD (1800-2199)';
  END IF;
  IF to_char(to_date(v_start, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_start
    OR to_char(to_date(v_end, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_end
    OR v_start > v_end THEN
    RAISE EXCEPTION 'Invalid release-period dates';
  END IF;

  SELECT * INTO v_existing FROM public.collection_options AS c
    WHERE c.id = p_id AND c.category_id = 'movies' AND c.kind = 'theme'
      AND c.provider_key = 'tmdb' AND c.provider_mode = 'discover'
      AND (jsonb_typeof(c.provider_config->'primaryReleaseDateGte') = 'string'
        OR jsonb_typeof(c.provider_config->'primaryReleaseDateLte') = 'string')
      AND NOT (c.provider_config ? 'keywordRules')
      AND NOT (c.provider_config ? 'withPeople')
      AND NOT (c.provider_config ? 'withCompanies')
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Editable release-period Movie Theme not found'; END IF;
  UPDATE public.collection_options
    SET browse_label = v_description,
        provider_config = (provider_config - 'primaryReleaseDateGte' - 'primaryReleaseDateLte' - 'displayTitle') ||
          jsonb_build_object('primaryReleaseDateGte', v_start,
            'primaryReleaseDateLte', v_end, 'displayTitle', v_title)
    WHERE id = v_existing.id;
  RETURN jsonb_build_object('id', v_existing.id);
END;
$function$;

CREATE FUNCTION public.admin_manage_movie_release_period_draft(
  p_action text,
  p_id text DEFAULT NULL,
  p_definition jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_draft public.admin_movie_theme_drafts%ROWTYPE;
  v_name text;
  v_slug text;
  v_title text;
  v_description text;
  v_start text;
  v_end text;
  v_option_id text;
  v_draft_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'delete_draft' THEN
    IF coalesce(p_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Invalid release-period draft ID';
    END IF;
    DELETE FROM public.admin_movie_theme_drafts
      WHERE id = p_id::uuid AND definition->>'discoveryMethod' = 'release_period'
      RETURNING * INTO v_draft;
    IF NOT FOUND THEN RAISE EXCEPTION 'Release-period draft not found'; END IF;
    RETURN jsonb_build_object('id', v_draft.id::text);
  ELSIF p_action = 'publish_draft' THEN
    IF coalesce(p_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Invalid release-period draft ID';
    END IF;
    SELECT * INTO v_draft FROM public.admin_movie_theme_drafts
      WHERE id = p_id::uuid AND definition->>'discoveryMethod' = 'release_period'
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Release-period draft not found'; END IF;
    -- Publish the saved draft only: never accept caller-supplied publish content.
    p_definition := v_draft.definition;
  ELSIF p_action <> 'save_draft' THEN
    RAISE EXCEPTION 'Unsupported release-period action';
  END IF;

  IF jsonb_typeof(p_definition) IS DISTINCT FROM 'object'
    OR p_definition->>'discoveryMethod' IS DISTINCT FROM 'release_period'
    OR (p_definition - 'discoveryMethod' - 'name' - 'slug' - 'displayTitle'
      - 'description' - 'startDate' - 'endDate') <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid release-period definition';
  END IF;
  IF jsonb_typeof(p_definition->'name') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_definition->'slug') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_definition->'displayTitle') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_definition->'description') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_definition->'startDate') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_definition->'endDate') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'Release-period fields must be strings';
  END IF;
  v_name := btrim(p_definition->>'name');
  v_slug := btrim(p_definition->>'slug');
  v_title := btrim(p_definition->>'displayTitle');
  v_description := btrim(p_definition->>'description');
  v_start := btrim(p_definition->>'startDate');
  v_end := btrim(p_definition->>'endDate');

  IF length(v_name) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Invalid theme name'; END IF;
  IF length(v_slug) > 60 OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid theme identifier';
  END IF;
  IF length(v_title) NOT BETWEEN 4 AND 120 THEN RAISE EXCEPTION 'Invalid list title'; END IF;
  IF length(v_description) > 180 THEN RAISE EXCEPTION 'Description too long'; END IF;

  -- Incomplete draft dates are allowed, but entered dates must be real ISO dates.
  IF (v_start <> '' AND (v_start !~ '^(18|19|20|21)[0-9]{2}-[0-9]{2}-[0-9]{2}$'
    OR to_char(to_date(v_start, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_start))
    OR (v_end <> '' AND (v_end !~ '^(18|19|20|21)[0-9]{2}-[0-9]{2}-[0-9]{2}$'
    OR to_char(to_date(v_end, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_end))
    OR (v_start <> '' AND v_end <> '' AND v_start > v_end) THEN
    RAISE EXCEPTION 'Invalid release-period dates';
  END IF;
  IF p_action = 'publish_draft' AND (v_start = '' OR v_end = '') THEN
    RAISE EXCEPTION 'Both release dates are required before publishing';
  END IF;

  IF p_action = 'save_draft' THEN
    IF EXISTS (SELECT 1 FROM public.collection_options AS c
      WHERE c.category_id = 'movies' AND c.kind = 'theme' AND c.slug = v_slug) THEN
      RAISE EXCEPTION 'A published Movie Theme already uses this identifier';
    END IF;
    IF p_id IS NULL THEN
      INSERT INTO public.admin_movie_theme_drafts (definition, created_by)
        VALUES (p_definition, auth.uid())
        RETURNING id INTO v_draft_id;
    ELSE
      IF p_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Invalid release-period draft ID';
      END IF;
      UPDATE public.admin_movie_theme_drafts
        SET definition = p_definition, updated_at = now()
        WHERE id = p_id::uuid AND definition->>'discoveryMethod' = 'release_period'
        RETURNING id INTO v_draft_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Release-period draft not found'; END IF;
    END IF;
    RETURN jsonb_build_object('id', v_draft_id::text);
  END IF;

  v_option_id := 'movies-theme-' || v_slug;
  IF EXISTS (SELECT 1 FROM public.collection_options AS c
    WHERE c.id = v_option_id OR
      (c.category_id = 'movies' AND c.kind = 'theme' AND c.slug = v_slug)) THEN
    RAISE EXCEPTION 'A published Movie Theme already uses this identifier';
  END IF;
  INSERT INTO public.collection_options (
    id, slug, category_id, kind, name, group_name, browse_label,
    keywords, search_hints, featured, trending_enabled, active,
    display_order, entity_kind, provider_key, provider_mode, provider_config
  ) VALUES (
    v_option_id, v_slug, 'movies', 'theme', v_name, 'era', v_description,
    ARRAY[lower(v_name)], ARRAY[v_title], false, true, true,
    (SELECT coalesce(max(display_order), 0) + 10 FROM public.collection_options
      WHERE category_id = 'movies' AND kind = 'theme'),
    'movie', 'tmdb', 'discover',
    jsonb_build_object('primaryReleaseDateGte', v_start,
      'primaryReleaseDateLte', v_end, 'displayTitle', v_title)
  );
  DELETE FROM public.admin_movie_theme_drafts WHERE id = v_draft.id;
  RETURN jsonb_build_object('id', v_option_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_movie_release_period_theme(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_movie_release_period_theme(text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_manage_movie_release_period_draft(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_movie_release_period_draft(text, text, jsonb) TO authenticated;
COMMIT;
