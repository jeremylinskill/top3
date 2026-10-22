-- Nine subjective Podcast Themes.
-- Five editorially Featured. All Trending-enabled.
-- Development first; existing Podcast Genres and Lists remain unchanged.

insert into public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
values
  ('podcasts-theme-never-miss', 'never-miss', 'podcasts', 'theme', 'Podcasts I Never Miss', 'listening', 'The shows you always come back to', array['podcasts i never miss', 'never miss'], array['Podcasts I Never Miss'], true, true, true, 10, 'podcast', null, 'curated', '{}'::jsonb),
  ('podcasts-theme-changed-how-i-think', 'changed-how-i-think', 'podcasts', 'theme', 'Podcasts That Changed How I Think', 'perspective', 'Shows that changed your perspective', array['podcasts that changed how i think', 'changed how i think'], array['Podcasts That Changed How I Think'], true, true, true, 20, 'podcast', null, 'curated', '{}'::jsonb),
  ('podcasts-theme-most-underrated', 'most-underrated', 'podcasts', 'theme', 'Most Underrated Podcasts', 'discovery', 'Great shows that deserve more listeners', array['most underrated podcasts', 'most underrated'], array['Most Underrated Podcasts'], true, true, true, 30, 'podcast', null, 'curated', '{}'::jsonb),
  ('podcasts-theme-recommend-to-everyone', 'recommend-to-everyone', 'podcasts', 'theme', 'Podcasts I''d Recommend to Everyone', 'recommendations', 'Shows you think everyone should hear', array['podcasts i''d recommend to everyone', 'recommend to everyone'], array['Podcasts I''d Recommend to Everyone'], true, true, true, 40, 'podcast', null, 'curated', '{}'::jsonb),
  ('podcasts-theme-best-hosts', 'best-hosts', 'podcasts', 'theme', 'Podcasts with the Best Hosts', 'personalities', 'Shows made special by their hosts', array['podcasts with the best hosts', 'best hosts'], array['Podcasts with the Best Hosts'], true, true, true, 50, 'podcast', null, 'curated', '{}'::jsonb),
  ('podcasts-theme-most-binge-worthy', 'most-binge-worthy', 'podcasts', 'theme', 'Most Binge-Worthy Podcasts', 'storytelling', 'Shows that keep you listening episode after episode', array['most binge-worthy podcasts', 'most binge worthy'], array['Most Binge-Worthy Podcasts'], false, true, true, 60, 'podcast', null, 'curated', '{}'::jsonb),
  ('podcasts-theme-learn-the-most', 'learn-the-most', 'podcasts', 'theme', 'Podcasts I Learn the Most From', 'learning', 'Shows that always teach you something', array['podcasts i learn the most from', 'learn the most'], array['Podcasts I Learn the Most From'], false, true, true, 70, 'podcast', null, 'curated', '{}'::jsonb),
  ('podcasts-theme-make-me-laugh', 'make-me-laugh', 'podcasts', 'theme', 'Podcasts That Make Me Laugh', 'humour', 'Shows that never fail to make you laugh', array['podcasts that make me laugh', 'make me laugh'], array['Podcasts That Make Me Laugh'], false, true, true, 80, 'podcast', null, 'curated', '{}'::jsonb),
  ('podcasts-theme-best-storytelling', 'best-storytelling', 'podcasts', 'theme', 'Podcasts with the Best Storytelling', 'storytelling', 'Shows that tell unforgettable stories', array['podcasts with the best storytelling', 'best storytelling'], array['Podcasts with the Best Storytelling'], false, true, true, 90, 'podcast', null, 'curated', '{}'::jsonb)
on conflict (id) do nothing;
