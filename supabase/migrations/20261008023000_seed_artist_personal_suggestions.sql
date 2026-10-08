insert into public.collection_option_suggestions (
  option_id,
  item_id,
  item,
  display_order,
  active
)
values
  ('artists-theme-discovered-late', 'apple-music-artist-155546', '{"id":"apple-music-artist-155546","title":"Talking Heads"}'::jsonb, 10, true),
  ('artists-theme-discovered-late', 'apple-music-artist-1285818', '{"id":"apple-music-artist-1285818","title":"Nick Drake"}'::jsonb, 20, true),
  ('artists-theme-discovered-late', 'apple-music-artist-487277', '{"id":"apple-music-artist-487277","title":"Kate Bush"}'::jsonb, 30, true),
  ('artists-theme-discovered-late', 'apple-music-artist-485677', '{"id":"apple-music-artist-485677","title":"Leonard Cohen"}'::jsonb, 40, true),
  ('artists-theme-discovered-late', 'apple-music-artist-79798', '{"id":"apple-music-artist-79798","title":"Nina Simone"}'::jsonb, 50, true),
  ('artists-theme-discovered-late', 'apple-music-artist-136829', '{"id":"apple-music-artist-136829","title":"The Velvet Underground"}'::jsonb, 60, true),
  ('artists-theme-discovered-late', 'apple-music-artist-2351764', '{"id":"apple-music-artist-2351764","title":"Big Star"}'::jsonb, 70, true),
  ('artists-theme-discovered-late', 'apple-music-artist-657309', '{"id":"apple-music-artist-657309","title":"Townes Van Zandt"}'::jsonb, 80, true),
  ('artists-theme-discovered-late', 'apple-music-artist-2893902', '{"id":"apple-music-artist-2893902","title":"Elliott Smith"}'::jsonb, 90, true),
  ('artists-theme-discovered-late', 'apple-music-artist-3029779', '{"id":"apple-music-artist-3029779","title":"Cocteau Twins"}'::jsonb, 100, true),
  ('artists-theme-discovered-late', 'apple-music-artist-206276', '{"id":"apple-music-artist-206276","title":"The Replacements"}'::jsonb, 110, true),
  ('artists-theme-discovered-late', 'apple-music-artist-532997', '{"id":"apple-music-artist-532997","title":"Mazzy Star"}'::jsonb, 120, true),
  ('artists-theme-discovered-late', 'apple-music-artist-872190', '{"id":"apple-music-artist-872190","title":"Jeff Buckley"}'::jsonb, 130, true),
  ('artists-theme-discovered-late', 'apple-music-artist-566519', '{"id":"apple-music-artist-566519","title":"The Cure"}'::jsonb, 140, true),
  ('artists-theme-discovered-late', 'apple-music-artist-722383', '{"id":"apple-music-artist-722383","title":"Joy Division"}'::jsonb, 150, true),
  ('artists-theme-came-around-on', 'apple-music-artist-657515', '{"id":"apple-music-artist-657515","title":"Radiohead"}'::jsonb, 10, true),
  ('artists-theme-came-around-on', 'apple-music-artist-462006', '{"id":"apple-music-artist-462006","title":"Bob Dylan"}'::jsonb, 20, true),
  ('artists-theme-came-around-on', 'apple-music-artist-83964', '{"id":"apple-music-artist-83964","title":"Tom Waits"}'::jsonb, 30, true),
  ('artists-theme-came-around-on', 'apple-music-artist-295015', '{"id":"apple-music-artist-295015","title":"Björk"}'::jsonb, 40, true),
  ('artists-theme-came-around-on', 'apple-music-artist-59606', '{"id":"apple-music-artist-59606","title":"Steely Dan"}'::jsonb, 50, true),
  ('artists-theme-came-around-on', 'apple-music-artist-50526', '{"id":"apple-music-artist-50526","title":"Rush"}'::jsonb, 60, true),
  ('artists-theme-came-around-on', 'apple-music-artist-155546', '{"id":"apple-music-artist-155546","title":"Talking Heads"}'::jsonb, 70, true),
  ('artists-theme-came-around-on', 'apple-music-artist-51075707', '{"id":"apple-music-artist-51075707","title":"The National"}'::jsonb, 80, true),
  ('artists-theme-came-around-on', 'apple-music-artist-147603', '{"id":"apple-music-artist-147603","title":"Wilco"}'::jsonb, 90, true),
  ('artists-theme-came-around-on', 'apple-music-artist-29525428', '{"id":"apple-music-artist-29525428","title":"LCD Soundsystem"}'::jsonb, 100, true),
  ('artists-theme-came-around-on', 'apple-music-artist-259437105', '{"id":"apple-music-artist-259437105","title":"Vampire Weekend"}'::jsonb, 110, true),
  ('artists-theme-came-around-on', 'apple-music-artist-62820413', '{"id":"apple-music-artist-62820413","title":"Arctic Monkeys"}'::jsonb, 120, true),
  ('artists-theme-came-around-on', 'apple-music-artist-464296584', '{"id":"apple-music-artist-464296584","title":"Lana Del Rey"}'::jsonb, 130, true),
  ('artists-theme-came-around-on', 'apple-music-artist-432942256', '{"id":"apple-music-artist-432942256","title":"Charli xcx"}'::jsonb, 140, true),
  ('artists-theme-came-around-on', 'apple-music-artist-829538', '{"id":"apple-music-artist-829538","title":"The Smiths"}'::jsonb, 150, true)
on conflict (option_id, item_id)
do update set
  item = excluded.item,
  display_order = excluded.display_order,
  active = excluded.active;
