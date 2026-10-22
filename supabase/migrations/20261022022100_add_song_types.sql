-- Four Song Types. Development first.
-- Existing Lists are unchanged.

insert into public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
values
  ('songs-type-acoustic', 'acoustic', 'songs', 'type', 'Acoustic Versions', 'format', 'Acoustic, unplugged and stripped-down recordings', array['acoustic', 'unplugged', 'stripped'], array['Acoustic versions', 'Unplugged performances'], false, false, true, 10, 'song', null, 'curated', '{}'::jsonb),
  ('songs-type-collaborations', 'collaborations', 'songs', 'type', 'Duets & Collaborations', 'format', 'Songs featuring two or more collaborating artists', array['duet', 'collaboration', 'featuring', 'with'], array['Duets', 'Artist collaborations'], false, false, true, 20, 'song', null, 'curated', '{}'::jsonb),
  ('songs-type-live', 'live', 'songs', 'type', 'Live Performances', 'format', 'Songs recorded during live performances', array['live', 'concert', 'unplugged', 'performance'], array['Live recordings', 'Concert performances'], false, false, true, 30, 'song', null, 'curated', '{}'::jsonb),
  ('songs-type-remixes', 'remixes', 'songs', 'type', 'Remixes', 'format', 'Remixed and reworked versions of songs', array['remix', 'rework', 'club mix', 'extended mix'], array['Song remixes', 'Alternative mixes'], false, false, true, 40, 'song', null, 'curated', '{}'::jsonb)
on conflict (id) do nothing;
