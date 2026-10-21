-- Initial Live Albums curated search suggestions.
-- Search prompts, not preselected album records.
-- Verify actual search quality during Development testing.
-- Does not modify existing user Lists.

insert into public.collection_option_suggestions (
  option_id, item_id, item, display_order, active
)
values
  (
    'albums-type-live',
    'live-albums-search-mtv-unplugged',
    '{"id": "live-albums-search-mtv-unplugged", "title": "MTV Unplugged"}'::jsonb,
    10,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-wembley',
    '{"id": "live-albums-search-live-at-wembley", "title": "Live at Wembley"}'::jsonb,
    20,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-the-apollo',
    '{"id": "live-albums-search-live-at-the-apollo", "title": "Live at the Apollo"}'::jsonb,
    30,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-red-rocks',
    '{"id": "live-albums-search-live-at-red-rocks", "title": "Live at Red Rocks"}'::jsonb,
    40,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-the-fillmore',
    '{"id": "live-albums-search-live-at-the-fillmore", "title": "Live at the Fillmore"}'::jsonb,
    50,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-budokan',
    '{"id": "live-albums-search-live-at-budokan", "title": "Live at Budokan"}'::jsonb,
    60,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-the-bbc',
    '{"id": "live-albums-search-live-at-the-bbc", "title": "Live at the BBC"}'::jsonb,
    70,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-the-royal-albert-hall',
    '{"id": "live-albums-search-live-at-the-royal-albert-hall", "title": "Live at the Royal Albert Hall"}'::jsonb,
    80,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-madison-square-garden',
    '{"id": "live-albums-search-live-at-madison-square-garden", "title": "Live at Madison Square Garden"}'::jsonb,
    90,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-the-roxy',
    '{"id": "live-albums-search-live-at-the-roxy", "title": "Live at the Roxy"}'::jsonb,
    100,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-the-greek',
    '{"id": "live-albums-search-live-at-the-greek", "title": "Live at the Greek"}'::jsonb,
    110,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-in-london',
    '{"id": "live-albums-search-live-in-london", "title": "Live in London"}'::jsonb,
    120,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-in-paris',
    '{"id": "live-albums-search-live-in-paris", "title": "Live in Paris"}'::jsonb,
    130,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-in-new-york',
    '{"id": "live-albums-search-live-in-new-york", "title": "Live in New York"}'::jsonb,
    140,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-in-tokyo',
    '{"id": "live-albums-search-live-in-tokyo", "title": "Live in Tokyo"}'::jsonb,
    150,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-in-concert',
    '{"id": "live-albums-search-in-concert", "title": "In Concert"}'::jsonb,
    160,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-carnegie-hall',
    '{"id": "live-albums-search-live-at-carnegie-hall", "title": "Live at Carnegie Hall"}'::jsonb,
    170,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-knebworth',
    '{"id": "live-albums-search-live-at-knebworth", "title": "Live at Knebworth"}'::jsonb,
    180,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-in-berlin',
    '{"id": "live-albums-search-live-in-berlin", "title": "Live in Berlin"}'::jsonb,
    190,
    true
  ),
  (
    'albums-type-live',
    'live-albums-search-live-at-the-troubadour',
    '{"id": "live-albums-search-live-at-the-troubadour", "title": "Live at the Troubadour"}'::jsonb,
    200,
    true
  )
on conflict (option_id, item_id)
do update set
  item = excluded.item,
  display_order = excluded.display_order,
  active = excluded.active;
