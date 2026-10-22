-- Five Book Types and nine subjective Book Themes.
-- Five editorially Featured Themes; all nine Trending-enabled.
-- Prepared locally. Deploy to Development only after migration review.

INSERT INTO public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
VALUES
  ('books-type-graphic-novels-comics', 'graphic-novels-comics', 'books', 'type', 'Graphic Novels & Comics', 'format', 'Books told primarily through sequential illustrations', ARRAY['graphic novels', 'comics', 'illustrated stories'], ARRAY['Graphic Novels & Comics'], false, false, true, 10, 'book', NULL, 'curated', '{"bookType": "graphic-novels-comics"}'::jsonb),
  ('books-type-novellas', 'novellas', 'books', 'type', 'Novellas', 'format', 'Compact works of fiction longer than short stories', ARRAY['novella', 'short novel', 'short fiction'], ARRAY['Novellas'], false, false, true, 20, 'book', NULL, 'curated', '{"bookType": "novellas"}'::jsonb),
  ('books-type-short-story-collections', 'short-story-collections', 'books', 'type', 'Short Story Collections', 'format', 'Books bringing several short stories into one volume', ARRAY['short story collection', 'short stories', 'collected stories'], ARRAY['Short Story Collections'], false, false, true, 30, 'book', NULL, 'curated', '{"bookType": "short-story-collections"}'::jsonb),
  ('books-type-essay-collections', 'essay-collections', 'books', 'type', 'Essay Collections', 'format', 'Books collecting essays and reflections on different subjects', ARRAY['essays', 'essay collection', 'reflections'], ARRAY['Essay Collections'], false, false, true, 40, 'book', NULL, 'curated', '{"bookType": "essay-collections"}'::jsonb),
  ('books-type-anthologies', 'anthologies', 'books', 'type', 'Anthologies', 'format', 'Curated selections of writing, often from multiple authors', ARRAY['anthology', 'selected writing', 'multiple authors'], ARRAY['Anthologies'], false, false, true, 50, 'book', NULL, 'curated', '{"bookType": "anthologies"}'::jsonb),
  ('books-theme-defined-my-childhood', 'defined-my-childhood', 'books', 'theme', 'Books That Defined My Childhood', 'nostalgia', 'The books that shaped your early reading years', ARRAY['childhood', 'first books', 'nostalgia'], ARRAY['Books That Defined My Childhood'], true, true, true, 10, 'book', NULL, 'curated', '{}'::jsonb),
  ('books-theme-couldnt-put-down', 'couldnt-put-down', 'books', 'theme', 'Books I Couldn''t Put Down', 'personal', 'Books that made you want to keep turning pages', ARRAY['page-turners', 'could not put down', 'absorbing'], ARRAY['Books I Couldn''t Put Down'], true, true, true, 20, 'book', NULL, 'curated', '{}'::jsonb),
  ('books-theme-changed-how-i-think', 'changed-how-i-think', 'books', 'theme', 'Books That Changed How I Think', 'perspective', 'Books that shifted your perspective or challenged your assumptions', ARRAY['new perspectives', 'life changing', 'ideas'], ARRAY['Books That Changed How I Think'], true, true, true, 30, 'book', NULL, 'curated', '{}'::jsonb),
  ('books-theme-recommend-to-everyone', 'recommend-to-everyone', 'books', 'theme', 'Books I''d Recommend to Everyone', 'personal', 'Books you believe more people should experience', ARRAY['recommendations', 'must read', 'share'], ARRAY['Books I''d Recommend to Everyone'], true, true, true, 40, 'book', NULL, 'curated', '{}'::jsonb),
  ('books-theme-read-again-first-time', 'read-again-first-time', 'books', 'theme', 'Books I Wish I Could Read Again for the First Time', 'nostalgia', 'Books whose first reading felt unforgettable', ARRAY['first time', 'rediscover', 'surprise'], ARRAY['Books I Wish I Could Read Again for the First Time'], true, true, true, 50, 'book', NULL, 'curated', '{}'::jsonb),
  ('books-theme-most-underrated', 'most-underrated', 'books', 'theme', 'Most Underrated Books', 'discovery', 'Underappreciated books you think deserve more readers', ARRAY['underrated', 'overlooked', 'hidden gems'], ARRAY['Most Underrated Books'], false, true, true, 60, 'book', NULL, 'curated', '{}'::jsonb),
  ('books-theme-made-me-cry', 'made-me-cry', 'books', 'theme', 'Books That Made Me Cry', 'emotion', 'Books that stayed with you emotionally', ARRAY['sad', 'emotional', 'heartbreaking'], ARRAY['Books That Made Me Cry'], false, true, true, 70, 'book', NULL, 'curated', '{}'::jsonb),
  ('books-theme-unforgettable-characters', 'unforgettable-characters', 'books', 'theme', 'Books with Unforgettable Characters', 'storytelling', 'Stories with characters you still think about', ARRAY['characters', 'memorable protagonists', 'character driven'], ARRAY['Books with Unforgettable Characters'], false, true, true, 80, 'book', NULL, 'curated', '{}'::jsonb),
  ('books-theme-best-plot-twists', 'best-plot-twists', 'books', 'theme', 'Books with the Best Plot Twists', 'storytelling', 'Books whose twists and reveals caught you off guard', ARRAY['plot twist', 'surprise ending', 'reveal'], ARRAY['Books with the Best Plot Twists'], false, true, true, 90, 'book', NULL, 'curated', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
