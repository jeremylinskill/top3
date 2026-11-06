-- DEVELOPMENT FIRST ONLY: make normalization idempotent for saved Curated Movies drafts.
-- The existing normalizer adds subtitle=releaseYear to saved draft items, but
-- rejected that same subtitle when publish_draft normalized the saved items again.
-- This replaces function code only. No stored drafts, suggestions, themes, or user lists are changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION public.admin_normalize_curated_movie_item(p_item jsonb)
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
  -- Subtitle is valid only when it is the same 4-digit release year that
  -- this function itself emits. Do not accept arbitrary new movie fields.
  IF jsonb_typeof(p_item) IS DISTINCT FROM 'object'
    OR (p_item - 'id' - 'title' - 'releaseYear' - 'imageUrl' - 'subtitle') <> '{}'::jsonb THEN
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
  IF p_item ? 'subtitle' THEN
    IF NOT (p_item ? 'releaseYear')
       OR jsonb_typeof(p_item->'subtitle') IS DISTINCT FROM 'string'
       OR v_year IS NULL OR v_year = ''
       OR (p_item->>'subtitle') IS DISTINCT FROM v_year THEN
      RAISE EXCEPTION 'Invalid release year subtitle';
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

-- Preserve the existing privilege model: only the security-definer admin RPC
-- may call this helper. A client cannot invoke it directly.
REVOKE ALL ON FUNCTION public.admin_normalize_curated_movie_item(jsonb)
  FROM PUBLIC, anon, authenticated;
COMMIT;
