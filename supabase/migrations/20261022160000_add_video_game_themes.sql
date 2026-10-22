-- Nine subjective Video Game Themes.
-- Five editorially Featured; all Trending-enabled.
-- Existing Genres and game search remain unchanged.

insert into public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
values
  ('games-theme-defined-my-childhood', 'defined-my-childhood', 'games', 'theme', 'Games That Defined My Childhood', 'nostalgia', 'The games that shaped your early gaming years', array['games that defined my childhood', 'defined my childhood'], array['Games That Defined My Childhood'], true, true, true, 10, 'game', null, 'curated', '{}'::jsonb),
  ('games-theme-keep-coming-back', 'keep-coming-back', 'games', 'theme', 'Games I Keep Coming Back To', 'replay', 'Games you never get tired of playing', array['games i keep coming back to', 'keep coming back'], array['Games I Keep Coming Back To'], false, true, true, 20, 'game', null, 'curated', '{}'::jsonb),
  ('games-theme-best-stories', 'best-stories', 'games', 'theme', 'Games with the Best Stories', 'storytelling', 'Games with unforgettable stories and characters', array['games with the best stories', 'best stories'], array['Games with the Best Stories'], true, true, true, 30, 'game', null, 'curated', '{}'::jsonb),
  ('games-theme-most-underrated', 'most-underrated', 'games', 'theme', 'Most Underrated Games', 'discovery', 'Great games that deserve more recognition', array['most underrated games', 'most underrated'], array['Most Underrated Games'], true, true, true, 40, 'game', null, 'curated', '{}'::jsonb),
  ('games-theme-best-with-friends', 'best-with-friends', 'games', 'theme', 'Best Games to Play with Friends', 'social', 'Your favourite shared gaming experiences', array['best games to play with friends', 'best with friends'], array['Best Games to Play with Friends'], true, true, true, 50, 'game', null, 'curated', '{}'::jsonb),
  ('games-theme-best-worlds', 'best-worlds', 'games', 'theme', 'Games with the Best Worlds', 'exploration', 'Games with incredible places to explore', array['games with the best worlds', 'best worlds'], array['Games with the Best Worlds'], false, true, true, 60, 'game', null, 'curated', '{}'::jsonb),
  ('games-theme-best-soundtracks', 'best-soundtracks', 'games', 'theme', 'Games with the Best Soundtracks', 'music', 'Games with unforgettable music', array['games with the best soundtracks', 'best soundtracks'], array['Games with the Best Soundtracks'], false, true, true, 70, 'game', null, 'curated', '{}'::jsonb),
  ('games-theme-most-challenging', 'most-challenging', 'games', 'theme', 'Most Challenging Games I''ve Beaten', 'challenge', 'Games that really tested your abilities', array['most challenging games i''ve beaten', 'most challenging'], array['Most Challenging Games I''ve Beaten'], false, true, true, 80, 'game', null, 'curated', '{}'::jsonb),
  ('games-theme-play-again-first-time', 'play-again-first-time', 'games', 'theme', 'Games I Wish I Could Play Again for the First Time', 'experiences', 'Unforgettable games you would love to rediscover', array['games i wish i could play again for the first time', 'play again first time'], array['Games I Wish I Could Play Again for the First Time'], true, true, true, 90, 'game', null, 'curated', '{}'::jsonb)
on conflict (id) do nothing;
