-- Nine subjective Song Themes.
-- Five editorially Featured; all Trending-enabled.
-- Development first. Existing Lists are unchanged.

insert into public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
values
  ('songs-theme-defined-my-youth', 'defined-my-youth', 'songs', 'theme', 'Songs That Defined My Youth', 'memories', 'Songs that shaped your early years', array['songs that defined my youth', 'defined my youth'], array['Songs That Defined My Youth'], true, true, true, 10, 'song', null, 'curated', '{}'::jsonb),
  ('songs-theme-remind-me-of-someone', 'remind-me-of-someone', 'songs', 'theme', 'Songs That Remind Me of Someone', 'memories', 'Songs that bring a particular person to mind', array['songs that remind me of someone', 'remind me of someone'], array['Songs That Remind Me of Someone'], true, true, true, 20, 'song', null, 'curated', '{}'::jsonb),
  ('songs-theme-got-me-through-tough-times', 'got-me-through-tough-times', 'songs', 'theme', 'Songs That Got Me Through Tough Times', 'emotions', 'Songs that helped you through difficult moments', array['songs that got me through tough times', 'got me through tough times'], array['Songs That Got Me Through Tough Times'], false, true, true, 30, 'song', null, 'curated', '{}'::jsonb),
  ('songs-theme-always-lift-my-mood', 'always-lift-my-mood', 'songs', 'theme', 'Songs That Always Lift My Mood', 'emotions', 'Songs that make you feel better every time', array['songs that always lift my mood', 'always lift my mood'], array['Songs That Always Lift My Mood'], true, true, true, 40, 'song', null, 'curated', '{}'::jsonb),
  ('songs-theme-give-me-goosebumps', 'give-me-goosebumps', 'songs', 'theme', 'Songs That Give Me Goosebumps', 'emotions', 'Songs with moments that stop you in your tracks', array['songs that give me goosebumps', 'give me goosebumps'], array['Songs That Give Me Goosebumps'], false, true, true, 50, 'song', null, 'curated', '{}'::jsonb),
  ('songs-theme-most-underrated', 'most-underrated', 'songs', 'theme', 'Most Underrated Songs', 'opinions', 'Brilliant songs that deserve more attention', array['most underrated songs', 'most underrated'], array['Most Underrated Songs'], true, true, true, 60, 'song', null, 'curated', '{}'::jsonb),
  ('songs-theme-best-sing-along', 'best-sing-along', 'songs', 'theme', 'Best Sing-Along Songs', 'activities', 'Songs you cannot help singing along to', array['best sing-along songs', 'best sing along'], array['Best Sing-Along Songs'], false, true, true, 70, 'song', null, 'curated', '{}'::jsonb),
  ('songs-theme-perfect-road-trip', 'perfect-road-trip', 'songs', 'theme', 'Perfect Road Trip Songs', 'activities', 'Songs made for a great drive', array['perfect road trip songs', 'perfect road trip'], array['Perfect Road Trip Songs'], false, true, true, 80, 'song', null, 'curated', '{}'::jsonb),
  ('songs-theme-best-lyrics', 'best-lyrics', 'songs', 'theme', 'Songs with the Best Lyrics', 'songwriting', 'Songs whose words stand out most', array['songs with the best lyrics', 'best lyrics'], array['Songs with the Best Lyrics'], true, true, true, 90, 'song', null, 'curated', '{}'::jsonb)
on conflict (id) do nothing;
