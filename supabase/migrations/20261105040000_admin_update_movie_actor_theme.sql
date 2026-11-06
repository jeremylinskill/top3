-- DEVELOPMENT ONLY until separately reviewed for Production.
-- Narrowly permits administrators to correct the actor, title, and description
-- for existing actor-based TMDB Movie Themes. Existing IDs, published lists,
-- curated suggestions, other discovery configurations and user data are unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.admin_update_movie_actor_theme(
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
  v_person_id integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR btrim(p_id) = '' OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid actor theme update';
  END IF;

  v_title := btrim(coalesce(p_details->>'displayTitle', ''));
  v_description := btrim(coalesce(p_details->>'description', ''));
  IF length(v_title) NOT BETWEEN 4 AND 120 THEN
    RAISE EXCEPTION 'Invalid list title';
  END IF;
  IF length(v_description) > 180 THEN
    RAISE EXCEPTION 'Description too long';
  END IF;
  IF jsonb_typeof(p_details->'personId') IS DISTINCT FROM 'number'
    OR coalesce(p_details->>'personId', '') !~ '^[1-9][0-9]{0,8}$' THEN
    RAISE EXCEPTION 'Invalid TMDB person ID';
  END IF;
  v_person_id := (p_details->>'personId')::integer;

  SELECT * INTO v_existing
  FROM public.collection_options
  WHERE id = p_id
    AND category_id = 'movies' AND kind = 'theme'
    AND provider_key = 'tmdb' AND provider_mode = 'discover'
    AND jsonb_typeof(provider_config->'withPeople') = 'number'
    AND NOT (provider_config ? 'keywordRules')
    AND NOT (provider_config ? 'withCompanies')
    AND NOT (provider_config ? 'primaryReleaseDateGte')
    AND NOT (provider_config ? 'primaryReleaseDateLte')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Editable actor-based Movie Theme not found';
  END IF;

  UPDATE public.collection_options
  SET browse_label = v_description,
      provider_config = v_existing.provider_config || jsonb_build_object(
        'withPeople', v_person_id,
        'displayTitle', v_title
      )
  WHERE id = p_id;

  RETURN jsonb_build_object('id', v_existing.id);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_movie_actor_theme(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_movie_actor_theme(text, jsonb) TO authenticated;
COMMIT;
