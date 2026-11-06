-- Development-only: prioritize editorially selected Netflix Originals.
-- TMDB production-company credits do not represent Netflix-distributed exclusives.
-- Preserves the existing option ID, user lists, curated suggestion rows and company ID.
DO $migration$
DECLARE
  existing jsonb;
BEGIN
  SELECT provider_config INTO existing
  FROM public.collection_options
  WHERE id = 'movies-theme-netflix-originals'
    AND category_id = 'movies'
    AND kind = 'theme'
    AND provider_key = 'tmdb'
    AND provider_mode = 'discover'
  FOR UPDATE;

  IF existing IS NULL THEN
    RAISE EXCEPTION 'Expected Netflix Originals theme missing; no changes made';
  END IF;
  IF existing->>'withCompanies' IS DISTINCT FROM '178464'
     OR existing ? 'keywordRules'
     OR existing ? 'withPeople'
     OR existing ? 'featuredMovieIds'
     OR existing ? 'featuredCompanyId' THEN
    RAISE EXCEPTION 'Unexpected Netflix Originals configuration; no changes made';
  END IF;

  UPDATE public.collection_options
  SET provider_config = existing || jsonb_build_object(
    'featuredCompanyId', 178464,
    'featuredMovieIds', '[426426,398978,492188,661374,49046,501929,556984,646380,545609,547016,405774,387426,283587,504949,906126]'::jsonb
  )
  WHERE id = 'movies-theme-netflix-originals';
END;
$migration$;
