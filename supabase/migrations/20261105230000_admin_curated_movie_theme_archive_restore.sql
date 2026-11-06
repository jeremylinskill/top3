-- DEVELOPMENT FIRST: reversible archive/restore for published Curated Movie Themes.
-- No existing rows, suggestions, user lists, or other Movie Theme methods are modified by this migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Active options are readable by everyone. Inactive Movie Themes must remain
-- visible to administrators so that the Archived themes UI can restore them.
-- This policy DOES NOT expose inactive options to non-administrators.
CREATE POLICY "Administrators can read archived movie themes"
  ON public.collection_options
  FOR SELECT TO authenticated
  USING (
    category_id = 'movies' AND kind = 'theme'
    AND EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid()) AND p.is_admin IS TRUE
    )
  );

CREATE FUNCTION public.admin_set_curated_movie_theme_active(
  p_id text,
  p_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_existing public.collection_options%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR btrim(p_id) = '' OR p_active IS NULL THEN
    RAISE EXCEPTION 'Curated theme ID and target state are required';
  END IF;
  -- Only the active flag is altered. Preserve identity, suggestion rows and lists.
  UPDATE public.collection_options AS c
    SET active = p_active
    WHERE c.id = p_id AND c.category_id = 'movies' AND c.kind = 'theme'
      AND c.provider_mode = 'curated' AND c.provider_key IS NULL
    RETURNING * INTO v_existing;
  IF NOT FOUND THEN RAISE EXCEPTION 'Curated Movie Theme not found'; END IF;
  RETURN jsonb_build_object('id', v_existing.id, 'active', v_existing.active);
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_set_curated_movie_theme_active(text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_curated_movie_theme_active(text, boolean)
  TO authenticated;
COMMIT;
