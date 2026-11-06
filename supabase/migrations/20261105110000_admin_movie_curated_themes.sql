-- DEVELOPMENT FIRST ONLY: administrator management of manually curated Movie Themes.
-- This migration adds functions; it does NOT rewrite any existing theme, suggestion, or user list.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Accept only the movie data we intentionally save from TMDB search.
-- Existing seeded title-only suggestions bypass this helper and remain unchanged.
CREATE FUNCTION public.admin_normalize_curated_movie_item(p_item jsonb)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path = ''
AS $fn$
DECLARE
  v_id text;
  v_title text;
  v_year text;
  v_image text;
  v_item jsonb;
BEGIN
  IF jsonb_typeof(p_item) IS DISTINCT FROM 'object'
    OR (p_item - 'id' - 'title' - 'releaseYear' - 'imageUrl') <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid curated movie fields';
  END IF;
  IF jsonb_typeof(p_item->'id') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_item->'title') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'Movie ID and title are required';
  END IF;
  v_id := p_item->>'id';
  v_title := btrim(p_item->>'title');
  IF v_id !~ '^movie-[1-9][0-9]{0,8}$' OR length(v_title) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Invalid TMDB movie ID or title';
  END IF;
  v_item := jsonb_build_object('id', v_id, 'title', v_title);
  IF p_item ? 'releaseYear' THEN
    IF jsonb_typeof(p_item->'releaseYear') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Invalid release year';
    END IF;
    v_year := p_item->>'releaseYear';
    IF v_year <> '' AND v_year !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Invalid release year'; END IF;
    IF v_year <> '' THEN
      v_item := v_item || jsonb_build_object('releaseYear', v_year, 'subtitle', v_year);
    END IF;
  END IF;
  IF p_item ? 'imageUrl' THEN
    IF jsonb_typeof(p_item->'imageUrl') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Invalid movie artwork';
    END IF;
    v_image := p_item->>'imageUrl';
    IF length(v_image) > 512 OR v_image !~ '^https://' THEN
      RAISE EXCEPTION 'Movie artwork must use HTTPS';
    END IF;
    v_item := v_item || jsonb_build_object('imageUrl', v_image);
  END IF;
  RETURN v_item;
END;
$fn$;

-- Read active suggestions for a curated theme even when its parent theme is archived.
-- Include a concurrency fingerprint so stale editor sessions cannot overwrite newer edits.
CREATE FUNCTION public.admin_get_movie_curated_theme(p_id text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_entries jsonb;
  v_version text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.collection_options AS c WHERE c.id = p_id
      AND c.category_id = 'movies' AND c.kind = 'theme'
      AND c.provider_mode = 'curated' AND c.provider_key IS NULL
  ) THEN RAISE EXCEPTION 'Curated Movie Theme not found'; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('rowId', s.id, 'item', s.item)
      ORDER BY s.display_order, s.id), '[]'::jsonb)
    INTO v_entries
  FROM public.collection_option_suggestions AS s
  WHERE s.option_id = p_id AND s.active IS TRUE;

  SELECT md5(coalesce(string_agg(
    s.id::text || ':' || s.item_id || ':' || s.display_order::text || ':' ||
    s.active::text || ':' || s.updated_at::text,
    '|' ORDER BY s.id), '')) INTO v_version
  FROM public.collection_option_suggestions AS s WHERE s.option_id = p_id;

  RETURN jsonb_build_object('entries', v_entries, 'version', v_version);
END;
$fn$;

CREATE FUNCTION public.admin_manage_movie_curated_theme(
  p_action text,
  p_id text DEFAULT NULL,
  p_definition jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_draft public.admin_movie_theme_drafts%ROWTYPE;
  v_existing public.collection_options%ROWTYPE;
  v_name text;
  v_slug text;
  v_title text;
  v_description text;
  v_movies jsonb;
  v_entries jsonb;
  v_entry jsonb;
  v_movie jsonb;
  v_row_id bigint;
  v_keep bigint[] := ARRAY[]::bigint[];
  v_ids text[] := ARRAY[]::text[];
  v_version text;
  v_option_id text;
  v_draft_id uuid;
  v_position integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'delete_draft' THEN
    IF coalesce(p_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Invalid curated draft ID';
    END IF;
    DELETE FROM public.admin_movie_theme_drafts
      WHERE id = p_id::uuid AND definition->>'discoveryMethod' = 'curated'
      RETURNING * INTO v_draft;
    IF NOT FOUND THEN RAISE EXCEPTION 'Curated draft not found'; END IF;
    RETURN jsonb_build_object('id', v_draft.id::text);
  END IF;

  -- Existing theme updates never change the theme identity, legacy suggestion item IDs,
  -- or pre-existing item JSON. Only explicitly removed rows are deleted.
  IF p_action = 'update_published' THEN
    IF jsonb_typeof(p_definition) IS DISTINCT FROM 'object'
      OR (p_definition - 'displayTitle' - 'description' - 'version' - 'entries') <> '{}'::jsonb
      OR jsonb_typeof(p_definition->'displayTitle') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_definition->'description') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_definition->'version') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_definition->'entries') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Invalid curated theme edit';
    END IF;
    v_title := btrim(p_definition->>'displayTitle');
    v_description := btrim(p_definition->>'description');
    v_entries := p_definition->'entries';
    IF length(v_title) NOT BETWEEN 4 AND 120 OR length(v_description) > 180 THEN
      RAISE EXCEPTION 'Invalid curated theme title or description';
    END IF;
    IF jsonb_array_length(v_entries) NOT BETWEEN 3 AND 60 THEN
      RAISE EXCEPTION 'Choose between 3 and 60 curated movies';
    END IF;
    SELECT * INTO v_existing FROM public.collection_options AS c
      WHERE c.id = p_id AND c.category_id = 'movies' AND c.kind = 'theme'
        AND c.provider_mode = 'curated' AND c.provider_key IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Editable curated Movie Theme not found'; END IF;
    SELECT md5(coalesce(string_agg(
      s.id::text || ':' || s.item_id || ':' || s.display_order::text || ':' ||
      s.active::text || ':' || s.updated_at::text,
      '|' ORDER BY s.id), '')) INTO v_version
    FROM public.collection_option_suggestions AS s WHERE s.option_id = p_id;
    IF v_version IS DISTINCT FROM (p_definition->>'version') THEN
      RAISE EXCEPTION 'This theme changed since you opened it. Go back and reopen the theme.';
    END IF;

    FOR v_entry IN SELECT value FROM jsonb_array_elements(v_entries) AS x(value) LOOP
      v_position := v_position + 1;
      IF jsonb_typeof(v_entry) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Invalid curated movie entry';
      END IF;
      IF (v_entry ? 'rowId') AND (v_entry - 'rowId') = '{}'::jsonb THEN
        IF jsonb_typeof(v_entry->'rowId') IS DISTINCT FROM 'number'
          OR coalesce(v_entry->>'rowId', '') !~ '^[1-9][0-9]{0,17}$' THEN
          RAISE EXCEPTION 'Invalid existing movie row';
        END IF;
        v_row_id := (v_entry->>'rowId')::bigint;
        IF v_row_id = ANY(v_keep) THEN RAISE EXCEPTION 'Duplicate curated movie row'; END IF;
        UPDATE public.collection_option_suggestions AS s
          SET display_order = v_position * 10
          WHERE s.id = v_row_id AND s.option_id = p_id AND s.active IS TRUE
          RETURNING s.item_id INTO v_option_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Existing curated movie was not found'; END IF;
      ELSIF (v_entry ? 'item') AND (v_entry - 'item') = '{}'::jsonb THEN
        v_movie := public.admin_normalize_curated_movie_item(v_entry->'item');
        v_option_id := v_movie->>'id';
        INSERT INTO public.collection_option_suggestions(option_id, item_id, item, display_order, active)
          VALUES (p_id, v_option_id, v_movie, v_position * 10, TRUE)
          ON CONFLICT (option_id, item_id) DO UPDATE
            SET display_order = EXCLUDED.display_order,
                item = EXCLUDED.item, active = TRUE
          RETURNING id INTO v_row_id;
        IF v_row_id = ANY(v_keep) THEN RAISE EXCEPTION 'Duplicate curated movie'; END IF;
      ELSE
        RAISE EXCEPTION 'Curated entry must specify an existing row or a new movie';
      END IF;
      IF v_option_id = ANY(v_ids) THEN RAISE EXCEPTION 'Duplicate curated movie ID'; END IF;
      v_ids := array_append(v_ids, v_option_id);
      v_keep := array_append(v_keep, v_row_id);
    END LOOP;
    DELETE FROM public.collection_option_suggestions AS s
      WHERE s.option_id = p_id AND s.active IS TRUE AND NOT (s.id = ANY(v_keep));
    UPDATE public.collection_options
      SET browse_label = v_description,
          provider_config = provider_config || jsonb_build_object('displayTitle', v_title)
      WHERE id = p_id;
    RETURN jsonb_build_object('id', p_id);
  END IF;

  IF p_action = 'publish_draft' THEN
    IF coalesce(p_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Invalid curated draft ID';
    END IF;
    SELECT * INTO v_draft FROM public.admin_movie_theme_drafts
      WHERE id = p_id::uuid AND definition->>'discoveryMethod' = 'curated' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Curated draft not found'; END IF;
    p_definition := v_draft.definition;
  ELSIF p_action <> 'save_draft' THEN
    RAISE EXCEPTION 'Unsupported curated Movie Theme action';
  END IF;

  IF jsonb_typeof(p_definition) IS DISTINCT FROM 'object'
    OR p_definition->>'discoveryMethod' IS DISTINCT FROM 'curated'
    OR (p_definition - 'discoveryMethod' - 'name' - 'slug' - 'displayTitle'
      - 'description' - 'movies') <> '{}'::jsonb
    OR jsonb_typeof(p_definition->'name') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_definition->'slug') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_definition->'displayTitle') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_definition->'description') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_definition->'movies') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid curated draft definition';
  END IF;
  v_name := btrim(p_definition->>'name');
  v_slug := btrim(p_definition->>'slug');
  v_title := btrim(p_definition->>'displayTitle');
  v_description := btrim(p_definition->>'description');
  v_movies := p_definition->'movies';
  IF length(v_name) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Invalid theme name'; END IF;
  IF length(v_slug) > 60 OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid theme identifier';
  END IF;
  IF length(v_title) NOT BETWEEN 4 AND 120 OR length(v_description) > 180 THEN
    RAISE EXCEPTION 'Invalid theme title or description';
  END IF;
  IF jsonb_array_length(v_movies) > 60 OR
    (p_action = 'publish_draft' AND jsonb_array_length(v_movies) < 3) THEN
    RAISE EXCEPTION 'Choose between 3 and 60 movies before publishing';
  END IF;
  -- Normalize saved movie objects and reject duplicate TMDB movie IDs.
  v_entries := '[]'::jsonb;
  FOR v_entry IN SELECT value FROM jsonb_array_elements(v_movies) AS x(value) LOOP
    v_movie := public.admin_normalize_curated_movie_item(v_entry);
    IF (v_movie->>'id') = ANY(v_ids) THEN RAISE EXCEPTION 'Duplicate curated movie'; END IF;
    v_ids := array_append(v_ids, v_movie->>'id');
    v_entries := v_entries || jsonb_build_array(v_movie);
  END LOOP;
  -- Use canonical normalized movie data for stored drafts and publishing.
  p_definition := jsonb_build_object('discoveryMethod', 'curated', 'name', v_name,
    'slug', v_slug, 'displayTitle', v_title, 'description', v_description, 'movies', v_entries);

  IF p_action = 'save_draft' THEN
    IF EXISTS (SELECT 1 FROM public.collection_options AS c
      WHERE c.category_id = 'movies' AND c.kind = 'theme' AND c.slug = v_slug) THEN
      RAISE EXCEPTION 'A published Movie Theme already uses this identifier';
    END IF;
    IF p_id IS NULL THEN
      INSERT INTO public.admin_movie_theme_drafts(definition, created_by)
        VALUES (p_definition, auth.uid()) RETURNING id INTO v_draft_id;
    ELSE
      IF coalesce(p_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Invalid curated draft ID';
      END IF;
      UPDATE public.admin_movie_theme_drafts
        SET definition = p_definition, updated_at = now()
        WHERE id = p_id::uuid AND definition->>'discoveryMethod' = 'curated'
        RETURNING id INTO v_draft_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Curated draft not found'; END IF;
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
    v_option_id, v_slug, 'movies', 'theme', v_name, 'personal', v_description,
    ARRAY[lower(v_name)], ARRAY[v_title], false, true, true,
    (SELECT coalesce(max(display_order), 0) + 10 FROM public.collection_options
      WHERE category_id = 'movies' AND kind = 'theme'),
    'movie', NULL, 'curated', jsonb_build_object('displayTitle', v_title)
  );
  v_position := 0;
  FOR v_movie IN SELECT value FROM jsonb_array_elements(v_entries) AS x(value) LOOP
    v_position := v_position + 1;
    INSERT INTO public.collection_option_suggestions(option_id, item_id, item, display_order)
      VALUES (v_option_id, v_movie->>'id', v_movie, v_position * 10);
  END LOOP;
  DELETE FROM public.admin_movie_theme_drafts WHERE id = v_draft.id;
  RETURN jsonb_build_object('id', v_option_id);
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_normalize_curated_movie_item(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_movie_curated_theme(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_movie_curated_theme(text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_manage_movie_curated_theme(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_movie_curated_theme(text, text, jsonb) TO authenticated;
COMMIT;
