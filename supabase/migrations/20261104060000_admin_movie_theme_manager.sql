-- DEVELOPMENT FIRST. Admin Movie Theme drafts and guarded publication workflow.
-- Do not run against Production without a separate reviewed migration plan.
-- No existing collection option IDs, published lists or suggestions are rewritten.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';

-- Existing profile policy permits self-updates. Harden the is_admin flag before
-- using it to authorize new catalogue writes. Service-role/admin operations remain available.
CREATE OR REPLACE FUNCTION public.guard_profile_admin_flag()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF auth.role() IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' AND NEW.is_admin IS TRUE THEN
      RAISE EXCEPTION 'Administrator privileges cannot be self-assigned';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Administrator privileges cannot be changed by users';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS guard_profile_admin_flag ON public.profiles;
CREATE TRIGGER guard_profile_admin_flag
BEFORE INSERT OR UPDATE OF is_admin ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_admin_flag();

CREATE TABLE public.admin_movie_theme_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_movie_theme_drafts_definition_object
    CHECK (jsonb_typeof(definition) = 'object')
);
CREATE UNIQUE INDEX admin_movie_theme_drafts_slug_unique
  ON public.admin_movie_theme_drafts ((definition->>'slug'));
ALTER TABLE public.admin_movie_theme_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only administrators can read movie theme drafts"
  ON public.admin_movie_theme_drafts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.is_admin IS TRUE
  ));
REVOKE ALL ON TABLE public.admin_movie_theme_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_movie_theme_drafts TO authenticated;
GRANT ALL ON TABLE public.admin_movie_theme_drafts TO service_role;

CREATE OR REPLACE FUNCTION public.admin_manage_movie_theme(
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
  v_existing public.collection_options%ROWTYPE;
  v_name text;
  v_slug text;
  v_title text;
  v_description text;
  v_min_votes integer;
  v_rules jsonb;
  v_pins jsonb;
  v_excluded jsonb;
  v_caps jsonb;
  v_terms jsonb;
  v_terms_array text[];
  v_config jsonb;
  v_option_id text;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  IF p_action IN ('archive', 'restore') THEN
    IF p_id IS NULL THEN RAISE EXCEPTION 'Missing published theme ID'; END IF;
    UPDATE public.collection_options
      SET active = (p_action = 'restore')
    WHERE id = p_id AND category_id = 'movies' AND kind = 'theme'
      AND provider_key = 'tmdb' AND provider_mode = 'discover'
      AND jsonb_typeof(provider_config->'keywordRules') = 'array'
    RETURNING * INTO v_existing;
    IF NOT FOUND THEN RAISE EXCEPTION 'Editable Movie Theme not found'; END IF;
    RETURN jsonb_build_object('id', v_existing.id, 'active', v_existing.active);
  ELSIF p_action = 'delete_draft' THEN
    IF p_id IS NULL THEN RAISE EXCEPTION 'Missing draft ID'; END IF;
    DELETE FROM public.admin_movie_theme_drafts WHERE id = p_id::uuid
      RETURNING * INTO v_draft;
    IF NOT FOUND THEN RAISE EXCEPTION 'Draft not found'; END IF;
    RETURN jsonb_build_object('id', v_draft.id::text);
  ELSIF p_action = 'publish_draft' THEN
    IF p_id IS NULL THEN RAISE EXCEPTION 'Missing draft ID'; END IF;
    SELECT * INTO v_draft FROM public.admin_movie_theme_drafts
      WHERE id = p_id::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Draft not found'; END IF;
    -- Drafts were checked when saved; do not accept caller-supplied publish fields.
    p_definition := v_draft.definition;
  ELSIF p_action NOT IN ('save_draft', 'update_published') THEN
    RAISE EXCEPTION 'Unsupported Movie Theme admin action';
  END IF;

  IF jsonb_typeof(p_definition) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid theme definition';
  END IF;
  v_name := btrim(coalesce(p_definition->>'name', ''));
  v_slug := btrim(coalesce(p_definition->>'slug', ''));
  v_title := btrim(coalesce(p_definition->>'displayTitle', ''));
  v_description := btrim(coalesce(p_definition->>'description', ''));
  IF length(v_name) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Invalid theme name'; END IF;
  IF length(v_slug) > 60 OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid theme slug';
  END IF;
  IF length(v_title) NOT BETWEEN 4 AND 120 THEN RAISE EXCEPTION 'Invalid list title'; END IF;
  IF length(v_description) > 180 THEN RAISE EXCEPTION 'Description too long'; END IF;

  v_terms := coalesce(p_definition->'keywordTerms', '[]'::jsonb);
  v_rules := coalesce(p_definition->'keywordRules', '[]'::jsonb);
  v_pins := coalesce(p_definition->'pinnedMovieIds', '[]'::jsonb);
  v_excluded := coalesce(p_definition->'excludedMovieIds', '[]'::jsonb);
  v_caps := coalesce(p_definition->'franchiseCaps', '[]'::jsonb);
  IF jsonb_typeof(v_terms) <> 'array' OR jsonb_array_length(v_terms) > 20
    OR jsonb_typeof(v_rules) <> 'array' OR jsonb_array_length(v_rules) > 8
    OR (p_action <> 'save_draft' AND jsonb_array_length(v_rules) < 1)
    OR jsonb_typeof(v_pins) <> 'array' OR jsonb_array_length(v_pins) > 20
    OR jsonb_typeof(v_excluded) <> 'array' OR jsonb_array_length(v_excluded) > 20
    OR jsonb_typeof(v_caps) <> 'array' OR jsonb_array_length(v_caps) > 10 THEN
    RAISE EXCEPTION 'Invalid discovery configuration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_rules) AS r(value)
    WHERE jsonb_typeof(value) <> 'object'
      OR coalesce(value->>'id', '') !~ '^[1-9][0-9]{0,8}$'
      OR coalesce(value->>'weight', '') !~ '^(10|[1-9])$'
  ) THEN RAISE EXCEPTION 'Invalid TMDB keyword rules'; END IF;
  IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(v_rules) AS r(value))
    <> jsonb_array_length(v_rules) THEN
    RAISE EXCEPTION 'Duplicate TMDB keyword IDs';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_pins || v_excluded) AS x(value)
    WHERE value::text !~ '^[1-9][0-9]{0,8}$'
  ) THEN RAISE EXCEPTION 'Invalid TMDB movie IDs'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_terms) AS x(value)
    WHERE jsonb_typeof(value) <> 'string'
      OR length(btrim(value #>> '{}')) NOT BETWEEN 1 AND 80
  ) THEN RAISE EXCEPTION 'Invalid keyword terms'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_caps) AS x(value)
    WHERE jsonb_typeof(value) <> 'object'
      OR length(btrim(coalesce(value->>'term', ''))) NOT BETWEEN 1 AND 50
      OR coalesce(value->>'max', '') !~ '^[1-9][0-9]?$'
  ) THEN RAISE EXCEPTION 'Invalid franchise cap'; END IF;
  IF coalesce(p_definition->>'minimumVotes', '') !~ '^(0|[1-9][0-9]{0,3})$' THEN
    RAISE EXCEPTION 'Invalid minimum audience votes';
  END IF;
  v_min_votes := (p_definition->>'minimumVotes')::integer;
  IF v_min_votes > 5000 THEN RAISE EXCEPTION 'Minimum audience votes too high'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_pins) a
    JOIN jsonb_array_elements(v_excluded) b ON a.value = b.value
  ) THEN RAISE EXCEPTION 'A movie cannot be pinned and excluded'; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', (value->>'id')::integer, 'weight', (value->>'weight')::integer
  )), '[]'::jsonb) INTO v_rules FROM jsonb_array_elements(v_rules) AS x(value);
  SELECT coalesce(array_agg(btrim(value)), ARRAY[]::text[])
    INTO v_terms_array FROM jsonb_array_elements_text(v_terms) AS x(value);
  v_config := jsonb_build_object(
    'displayTitle', v_title,
    'keywordRules', v_rules,
    'pinnedMovieIds', v_pins,
    'excludedMovieIds', v_excluded,
    'minimumVotes', v_min_votes,
    'franchiseCaps', v_caps
  );

  IF p_action = 'save_draft' THEN
    IF p_id IS NULL THEN
      IF EXISTS (SELECT 1 FROM public.collection_options
        WHERE category_id = 'movies' AND kind = 'theme' AND slug = v_slug) THEN
        RAISE EXCEPTION 'This Movie Theme identifier is already published';
      END IF;
      INSERT INTO public.admin_movie_theme_drafts(definition, created_by)
        VALUES(p_definition, auth.uid()) RETURNING id INTO v_id;
    ELSE
      UPDATE public.admin_movie_theme_drafts
        SET definition = p_definition, updated_at = now()
        WHERE id = p_id::uuid RETURNING id INTO v_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Draft not found'; END IF;
    END IF;
    RETURN jsonb_build_object('id', v_id::text);
  ELSIF p_action = 'publish_draft' THEN
    v_option_id := 'movies-theme-' || v_slug;
    IF EXISTS (
      SELECT 1 FROM public.collection_options
      WHERE id = v_option_id OR
        (category_id = 'movies' AND kind = 'theme' AND slug = v_slug)
    ) THEN RAISE EXCEPTION 'A published Movie Theme already uses this identifier'; END IF;
    INSERT INTO public.collection_options (
      id, slug, category_id, kind, name, group_name, browse_label,
      keywords, search_hints, featured, trending_enabled, active,
      display_order, entity_kind, provider_key, provider_mode, provider_config
    ) VALUES (
      v_option_id, v_slug, 'movies', 'theme', v_name, 'subject', v_description,
      v_terms_array, ARRAY[v_title], false, true, true,
      (SELECT coalesce(max(display_order), 0) + 10 FROM public.collection_options
         WHERE category_id='movies' AND kind='theme'),
      'movie', 'tmdb', 'discover', v_config
    );
    DELETE FROM public.admin_movie_theme_drafts WHERE id = v_draft.id;
    RETURN jsonb_build_object('id', v_option_id);
  ELSIF p_action = 'update_published' THEN
    IF p_id IS NULL THEN RAISE EXCEPTION 'Missing published theme ID'; END IF;
    SELECT * INTO v_existing FROM public.collection_options
      WHERE id = p_id AND category_id = 'movies' AND kind = 'theme'
        AND provider_key = 'tmdb' AND provider_mode = 'discover'
        AND jsonb_typeof(provider_config->'keywordRules') = 'array'
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Editable Movie Theme not found'; END IF;
    IF v_existing.slug <> v_slug OR v_existing.name <> v_name THEN
      RAISE EXCEPTION 'Published theme names and IDs are fixed to preserve existing lists';
    END IF;
    UPDATE public.collection_options
      SET browse_label = v_description,
        keywords = v_terms_array,
        provider_config = (provider_config - 'displayTitle' - 'keywordRules'
          - 'pinnedMovieIds' - 'excludedMovieIds' - 'minimumVotes' - 'franchiseCaps') || v_config
      WHERE id = p_id;
    RETURN jsonb_build_object('id', p_id);
  END IF;
  RAISE EXCEPTION 'Unexpected Movie Theme action';
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_manage_movie_theme(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_movie_theme(text, text, jsonb) TO authenticated;

COMMIT;
