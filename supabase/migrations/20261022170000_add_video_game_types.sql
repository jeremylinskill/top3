-- Five gameplay-based Video Game Types.
-- Prepared locally; do not deploy until IGDB filtering is validated.

insert into public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
values
  ('games-type-single-player', 'single-player', 'games', 'type', 'Single-Player Games', 'gameplay', 'Games designed to be played individually', array['single player', 'solo', 'singleplayer'], array['Single-Player Games'], false, false, true, 10, 'game', null, 'curated', '{"gameType": "single-player"}'::jsonb),
  ('games-type-online-multiplayer', 'online-multiplayer', 'games', 'type', 'Online Multiplayer Games', 'gameplay', 'Games played with or against others online', array['online multiplayer', 'online', 'multiplayer'], array['Online Multiplayer Games'], false, false, true, 20, 'game', null, 'curated', '{"gameType": "online-multiplayer"}'::jsonb),
  ('games-type-local-coop', 'local-coop', 'games', 'type', 'Local Co-op Games', 'gameplay', 'Cooperative games played together locally', array['local coop', 'couch coop', 'offline cooperative'], array['Local Co-op Games'], false, false, true, 30, 'game', null, 'curated', '{"gameType": "local-coop"}'::jsonb),
  ('games-type-online-coop', 'online-coop', 'games', 'type', 'Online Co-op Games', 'gameplay', 'Cooperative games played together online', array['online coop', 'online cooperative', 'cooperative multiplayer'], array['Online Co-op Games'], false, false, true, 40, 'game', null, 'curated', '{"gameType": "online-coop"}'::jsonb),
  ('games-type-open-world', 'open-world', 'games', 'type', 'Open-World Games', 'gameplay', 'Games with large worlds to freely explore', array['open world', 'exploration', 'sandbox'], array['Open-World Games'], false, false, true, 50, 'game', null, 'curated', '{"gameType": "open-world"}'::jsonb)
on conflict (id) do nothing;
