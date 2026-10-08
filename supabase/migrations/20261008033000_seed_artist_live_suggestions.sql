insert into public.collection_option_suggestions (
  option_id,
  item_id,
  item,
  display_order,
  active
)
values
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-3296287', '{"id":"apple-music-artist-3296287","title":"Queen"}'::jsonb, 10, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-155814', '{"id":"apple-music-artist-155814","title":"Prince"}'::jsonb, 20, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-551695', '{"id":"apple-music-artist-551695","title":"David Bowie"}'::jsonb, 30, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-62852', '{"id":"apple-music-artist-62852","title":"Jimi Hendrix"}'::jsonb, 40, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-994656', '{"id":"apple-music-artist-994656","title":"Led Zeppelin"}'::jsonb, 50, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-112018', '{"id":"apple-music-artist-112018","title":"Nirvana"}'::jsonb, 60, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-522000', '{"id":"apple-music-artist-522000","title":"The Clash"}'::jsonb, 70, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-70936', '{"id":"apple-music-artist-70936","title":"Johnny Cash"}'::jsonb, 80, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-98742', '{"id":"apple-music-artist-98742","title":"Aretha Franklin"}'::jsonb, 90, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-488075', '{"id":"apple-music-artist-488075","title":"Tina Turner"}'::jsonb, 100, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-1248588', '{"id":"apple-music-artist-1248588","title":"The Doors"}'::jsonb, 110, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-365673', '{"id":"apple-music-artist-365673","title":"Janis Joplin"}'::jsonb, 120, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-189254', '{"id":"apple-music-artist-189254","title":"Otis Redding"}'::jsonb, 130, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-136975', '{"id":"apple-music-artist-136975","title":"The Beatles"}'::jsonb, 140, true),
  ('artists-theme-wish-id-seen-live', 'apple-music-artist-161527', '{"id":"apple-music-artist-161527","title":"Tom Petty & The Heartbreakers"}'::jsonb, 150, true),

  ('artists-theme-worth-travelling-for', 'apple-music-artist-178834', '{"id":"apple-music-artist-178834","title":"Bruce Springsteen"}'::jsonb, 10, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-1419227', '{"id":"apple-music-artist-1419227","title":"Beyoncé"}'::jsonb, 20, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-159260351', '{"id":"apple-music-artist-159260351","title":"Taylor Swift"}'::jsonb, 30, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-657515', '{"id":"apple-music-artist-657515","title":"Radiohead"}'::jsonb, 40, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-78500', '{"id":"apple-music-artist-78500","title":"U2"}'::jsonb, 50, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-467464', '{"id":"apple-music-artist-467464","title":"Pearl Jam"}'::jsonb, 60, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-6906197', '{"id":"apple-music-artist-6906197","title":"Foo Fighters"}'::jsonb, 70, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-471744', '{"id":"apple-music-artist-471744","title":"Coldplay"}'::jsonb, 80, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-3996865', '{"id":"apple-music-artist-3996865","title":"Metallica"}'::jsonb, 90, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-368183298', '{"id":"apple-music-artist-368183298","title":"Kendrick Lamar"}'::jsonb, 100, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-277293880', '{"id":"apple-music-artist-277293880","title":"Lady Gaga"}'::jsonb, 110, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-479756766', '{"id":"apple-music-artist-479756766","title":"The Weeknd"}'::jsonb, 120, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-1065981054', '{"id":"apple-music-artist-1065981054","title":"Billie Eilish"}'::jsonb, 130, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-1436413980', '{"id":"apple-music-artist-1436413980","title":"Zach Bryan"}'::jsonb, 140, true),
  ('artists-theme-worth-travelling-for', 'apple-music-artist-1249595', '{"id":"apple-music-artist-1249595","title":"The Rolling Stones"}'::jsonb, 150, true)
on conflict (option_id, item_id)
do update set
  item = excluded.item,
  display_order = excluded.display_order,
  active = excluded.active;
