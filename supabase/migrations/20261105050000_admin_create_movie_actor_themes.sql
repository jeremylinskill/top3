-- DEVELOPMENT FIRST. Create actor-based Movie Themes through admin-only drafts.
-- Does not modify existing themes, suggestions, or published user lists.
-- This separate RPC cannot manage keyword drafts or actor-theme updates.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE FUNCTION public.admin_manage_movie_actor_draft(
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
  v_person_id integer;
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
      RAISE EXCEPTION 'Invalid actor draft ID';
    END IF;
    DELETE FROM public.admin_movie_theme_drafts
      WHERE id = p_id::uuid AND definition->>'discoveryMethod' = 'actor'
      RETURNING * INTO v_draft;
    IF NOT FOUND THEN RAISE EXCEPTION 'Actor draft not found'; END IF;
    RETURN jsonb_build_object('id', v_draft.id::text);
  ELSIF p_action = 'publish_draft' THEN
    IF coalesce(p_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Invalid actor draft ID';
    END IF;
    SELECT * INTO v_draft FROM public.admin_movie_theme_drafts
      WHERE id = p_id::uuid AND definition->>'discoveryMethod' = 'actor'
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Actor draft not found'; END IF;
    -- Only the saved draft is authoritative at publish time.
    p_definition := v_draft.definition;
  ELSIF p_action <> 'save_draft' THEN
    RAISE EXCEPTION 'Unsupported actor Movie Theme action';
  END IF;

  IF jsonb_typeof(p_definition) IS DISTINCT FROM 'object'
    OR p_definition->>'discoveryMethod' IS DISTINCT FROM 'actor'
    OR (p_definition - 'discoveryMethod' - 'name' - 'slug' - 'displayTitle'
      - 'description' - 'personId') <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid actor theme definition';
  END IF;
  v_name := btrim(coalesce(p_definition->>'name', ''));
  v_slug := btrim(coalesce(p_definition->>'slug', ''));
  v_title := btrim(coalesce(p_definition->>'displayTitle', ''));
  v_description := btrim(coalesce(p_definition->>'description', ''));
  IF length(v_name) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Invalid theme name'; END IF;
  IF length(v_slug) > 60 OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid theme identifier';
  END IF;
  IF length(v_title) NOT BETWEEN 4 AND 120 THEN RAISE EXCEPTION 'Invalid list title'; END IF;
  IF length(v_description) > 180 THEN RAISE EXCEPTION 'Description too long'; END IF;
  IF jsonb_typeof(p_definition->'personId') IS DISTINCT FROM 'number'
    OR coalesce(p_definition->>'personId', '') !~ '^(0|[1-9][0-9]{0,8})$' THEN
    RAISE EXCEPTION 'Invalid TMDB person ID';
  END IF;
  v_person_id := (p_definition->>'personId')::integer;
  IF p_action = 'publish_draft' AND v_person_id = 0 THEN
    RAISE EXCEPTION 'Select a TMDB actor before publishing';
  END IF;

  IF p_action = 'save_draft' THEN
    -- Prevent a saved actor draft from colliding with any existing Movie Theme.
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
        RAISE EXCEPTION 'Invalid actor draft ID';
      END IF;
      UPDATE public.admin_movie_theme_drafts
        SET definition = p_definition, updated_at = now()
        WHERE id = p_id::uuid AND definition->>'discoveryMethod' = 'actor'
        RETURNING id INTO v_draft_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Actor draft not found'; END IF;
    END IF;
    RETURN jsonb_build_object('id', v_draft_id::text);
  END IF;

  v_option_id := 'movies-theme-' || v_slug;
  -- Keep IDs and slugs globally stable. Existing user lists are never touched.
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
    v_option_id, v_slug, 'movies', 'theme', v_name, 'people', v_description,
    ARRAY[lower(v_name)], ARRAY[v_title], false, true, true,
    (SELECT coalesce(max(display_order), 0) + 10 FROM public.collection_options
      WHERE category_id = 'movies' AND kind = 'theme'),
    'movie', 'tmdb', 'discover',
    jsonb_build_object('withPeople', v_person_id, 'displayTitle', v_title)
  );
  DELETE FROM public.admin_movie_theme_drafts WHERE id = v_draft.id;
  RETURN jsonb_build_object('id', v_option_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_manage_movie_actor_draft(text, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_movie_actor_draft(text, text, jsonb)
  TO authenticated;
COMMIT;
