-- Curated search suggestions for Compilation Albums.
-- Suggestions initiate Apple Music album searches.
-- All 20 search terms were evaluated against Development.
-- No existing user Lists are modified.
-- Apply to Development first; Production requires approval.

insert into public.collection_option_suggestions (
  option_id,
  item_id,
  item,
  display_order,
  active
)
values
  (
    'albums-type-compilations',
    'compilations-search-greatest-hits',
    '{"id": "compilations-search-greatest-hits", "title": "Greatest Hits"}'::jsonb,
    10,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-motown',
    '{"id": "compilations-search-motown", "title": "Motown"}'::jsonb,
    20,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-now',
    '{"id": "compilations-search-now", "title": "NOW"}'::jsonb,
    30,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-one-hit-wonders',
    '{"id": "compilations-search-one-hit-wonders", "title": "One Hit Wonders"}'::jsonb,
    40,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-number-1s',
    '{"id": "compilations-search-number-1s", "title": "Number 1s"}'::jsonb,
    50,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-best-of-the-70s',
    '{"id": "compilations-search-best-of-the-70s", "title": "Best of the 70s"}'::jsonb,
    60,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-best-of-the-80s',
    '{"id": "compilations-search-best-of-the-80s", "title": "Best of the 80s"}'::jsonb,
    70,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-best-of-the-90s',
    '{"id": "compilations-search-best-of-the-90s", "title": "Best of the 90s"}'::jsonb,
    80,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-best-of-the-2000s',
    '{"id": "compilations-search-best-of-the-2000s", "title": "Best of the 2000s"}'::jsonb,
    90,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-classic-rock-hits',
    '{"id": "compilations-search-classic-rock-hits", "title": "Classic Rock Hits"}'::jsonb,
    100,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-soul-classics',
    '{"id": "compilations-search-soul-classics", "title": "Soul Classics"}'::jsonb,
    110,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-disco-classics',
    '{"id": "compilations-search-disco-classics", "title": "Disco Classics"}'::jsonb,
    120,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-reggae-gold',
    '{"id": "compilations-search-reggae-gold", "title": "Reggae Gold"}'::jsonb,
    130,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-jazz-classics',
    '{"id": "compilations-search-jazz-classics", "title": "Jazz Classics"}'::jsonb,
    140,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-blues-classics',
    '{"id": "compilations-search-blues-classics", "title": "Blues Classics"}'::jsonb,
    150,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-hip-hop-classics',
    '{"id": "compilations-search-hip-hop-classics", "title": "Hip Hop Classics"}'::jsonb,
    160,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-funk-classics',
    '{"id": "compilations-search-funk-classics", "title": "Funk Classics"}'::jsonb,
    170,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-pop-classics',
    '{"id": "compilations-search-pop-classics", "title": "Pop Classics"}'::jsonb,
    180,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-country-classics',
    '{"id": "compilations-search-country-classics", "title": "Country Classics"}'::jsonb,
    190,
    true
  ),
  (
    'albums-type-compilations',
    'compilations-search-90s-r-b',
    '{"id": "compilations-search-90s-r-b", "title": "90s R&B"}'::jsonb,
    200,
    true
  )
on conflict (option_id, item_id)
do update set
  item = excluded.item,
  display_order = excluded.display_order,
  active = excluded.active;
