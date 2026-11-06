-- Development-only customizable full list titles for Heists and Monsters.
-- This is an optional display title; the selector name, slug, theme identity,
-- provider discovery rules, list IDs, and item ranks remain unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '45s';

DO $check$
BEGIN
  IF (
    SELECT count(*) FROM public.collection_options
    WHERE category_id = 'movies'
      AND kind = 'theme'
      AND ((id = 'movies-theme-heists' AND slug = 'heists' AND name = 'Heists')
        OR (id = 'movies-theme-monsters' AND slug = 'monsters' AND name = 'Monsters'))
  ) <> 2 THEN
    RAISE EXCEPTION 'STOP: Expected Heists and Monsters theme options not present';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.collection_options
    WHERE id IN ('movies-theme-heists', 'movies-theme-monsters')
      AND nullif(btrim(provider_config->>'displayTitle'), '') IS NOT NULL
      AND provider_config->>'displayTitle' <> CASE id
        WHEN 'movies-theme-heists' THEN 'Top 3 Heist Movies'
        WHEN 'movies-theme-monsters' THEN 'Top 3 Monster Movies'
      END
  ) THEN
    RAISE EXCEPTION 'STOP: Existing customized display title would be overwritten';
  END IF;
END;
$check$;

UPDATE public.collection_options
SET provider_config = coalesce(provider_config, '{}'::jsonb) ||
  jsonb_build_object('displayTitle', CASE id
    WHEN 'movies-theme-heists' THEN 'Top 3 Heist Movies'
    ELSE 'Top 3 Monster Movies'
  END)
WHERE id IN ('movies-theme-heists', 'movies-theme-monsters')
  AND (provider_config->>'displayTitle') IS DISTINCT FROM CASE id
    WHEN 'movies-theme-heists' THEN 'Top 3 Heist Movies'
    ELSE 'Top 3 Monster Movies'
  END;

-- Update only the exact old default title for any existing draft/published
-- list on these options. Custom user titles are not touched.
UPDATE public.collections
SET title = CASE collection_option_id
  WHEN 'movies-theme-heists' THEN 'Top 3 Heist Movies'
  ELSE 'Top 3 Monster Movies'
END
WHERE (collection_option_id = 'movies-theme-heists' AND title = 'Top 3 Heists')
   OR (collection_option_id = 'movies-theme-monsters' AND title = 'Top 3 Monsters');

COMMIT;
