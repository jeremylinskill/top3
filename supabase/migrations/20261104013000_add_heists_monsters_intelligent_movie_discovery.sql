-- Top 3 Development only: configurable Heists / Monsters discovery topics.
-- This migration creates option rows only; it does not alter existing lists.
-- REVIEW and run linked --dry-run before applying to Top3 - Dev.
-- If an existing slug has a different id, abort rather than duplicate it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.collection_options
    WHERE category_id = 'movies' AND kind = 'theme'
      AND slug IN ('heists', 'monsters')
      AND id NOT IN ('movies-theme-heists','movies-theme-monsters')
  ) THEN
    RAISE EXCEPTION 'Conflicting Movies theme slug; review before applying';
  END IF;
END $$;

INSERT INTO public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
VALUES
  ('movies-theme-heists', 'heists', 'movies', 'theme', 'Heists', 'subject', 'Elaborate robberies, daring thefts and carefully planned jobs', ARRAY['heist', 'heists', 'robbery', 'bank robbery', 'caper']::text[], ARRAY['Best heist movies', 'Great robbery films']::text[], false, true, true, 80, 'movie', 'tmdb', 'discover', '{"keywordRules":[{"id":10051,"weight":5},{"id":15363,"weight":4},{"id":642,"weight":2},{"id":159469,"weight":3},{"id":156031,"weight":3}],"pinnedMovieIds":[9654],"excludedMovieIds":[14560],"minimumVotes":150}'::jsonb),
  ('movies-theme-monsters', 'monsters', 'movies', 'theme', 'Monsters', 'subject', 'Memorable creature features, giant beasts and movie monsters', ARRAY['monster', 'monsters', 'creature feature', 'kaiju', 'giant monster']::text[], ARRAY['Best monster movies', 'Creature features']::text[], false, true, true, 90, 'movie', 'tmdb', 'discover', '{"keywordRules":[{"id":1299,"weight":4},{"id":11100,"weight":6},{"id":161791,"weight":6},{"id":158126,"weight":5},{"id":33696,"weight":4}],"pinnedMovieIds":[940721,9362,1091],"excludedMovieIds":[508943,700391,436969],"minimumVotes":250,"franchiseCaps":[{"term":"godzilla","max":2},{"term":"kong","max":2},{"term":"pacific rim","max":1}]}'::jsonb)
ON CONFLICT (id) DO NOTHING;
