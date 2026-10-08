insert into public.collection_option_suggestions (
  option_id,
  item_id,
  item,
  display_order,
  active
)
values
  ('artists-theme-1980s-artists', 'apple-music-artist-155814', '{"id":"apple-music-artist-155814","title":"Prince"}'::jsonb, 10, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-32940', '{"id":"apple-music-artist-32940","title":"Michael Jackson"}'::jsonb, 20, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-20044', '{"id":"apple-music-artist-20044","title":"Madonna"}'::jsonb, 30, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-178834', '{"id":"apple-music-artist-178834","title":"Bruce Springsteen"}'::jsonb, 40, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-78500', '{"id":"apple-music-artist-78500","title":"U2"}'::jsonb, 50, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-13952', '{"id":"apple-music-artist-13952","title":"Whitney Houston"}'::jsonb, 60, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-894337', '{"id":"apple-music-artist-894337","title":"George Michael"}'::jsonb, 70, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-1272779', '{"id":"apple-music-artist-1272779","title":"Janet Jackson"}'::jsonb, 80, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-551695', '{"id":"apple-music-artist-551695","title":"David Bowie"}'::jsonb, 90, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-93818', '{"id":"apple-music-artist-93818","title":"The Police"}'::jsonb, 100, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-487384', '{"id":"apple-music-artist-487384","title":"Duran Duran"}'::jsonb, 110, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-59291142', '{"id":"apple-music-artist-59291142","title":"Cyndi Lauper"}'::jsonb, 120, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-122782', '{"id":"apple-music-artist-122782","title":"Bon Jovi"}'::jsonb, 130, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-106621', '{"id":"apple-music-artist-106621","title":"Guns N'' Roses"}'::jsonb, 140, true),
  ('artists-theme-1980s-artists', 'apple-music-artist-488075', '{"id":"apple-music-artist-488075","title":"Tina Turner"}'::jsonb, 150, true)
on conflict (option_id, item_id)
do update set
  item = excluded.item,
  display_order = excluded.display_order,
  active = excluded.active;
