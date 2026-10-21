-- Curated Soundtracks search suggestions.
-- Uses the 20 titles selected for Top 3.
-- Suggestion chips initiate Apple Music searches.
-- No existing user collections are modified.

insert into public.collection_option_suggestions (
  option_id,
  item_id,
  item,
  display_order,
  active
)
values
  (
    'albums-type-soundtracks',
    'soundtracks-search-the-bodyguard',
    '{"id": "soundtracks-search-the-bodyguard", "title": "The Bodyguard"}'::jsonb,
    10,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-saturday-night-fever',
    '{"id": "soundtracks-search-saturday-night-fever", "title": "Saturday Night Fever"}'::jsonb,
    20,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-dirty-dancing',
    '{"id": "soundtracks-search-dirty-dancing", "title": "Dirty Dancing"}'::jsonb,
    30,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-titanic',
    '{"id": "soundtracks-search-titanic", "title": "Titanic"}'::jsonb,
    40,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-purple-rain',
    '{"id": "soundtracks-search-purple-rain", "title": "Purple Rain"}'::jsonb,
    50,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-flashdance',
    '{"id": "soundtracks-search-flashdance", "title": "Flashdance"}'::jsonb,
    60,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-grease',
    '{"id": "soundtracks-search-grease", "title": "Grease"}'::jsonb,
    70,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-top-gun',
    '{"id": "soundtracks-search-top-gun", "title": "Top Gun"}'::jsonb,
    80,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-footloose',
    '{"id": "soundtracks-search-footloose", "title": "Footloose"}'::jsonb,
    90,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-the-lion-king',
    '{"id": "soundtracks-search-the-lion-king", "title": "The Lion King"}'::jsonb,
    100,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-guardians-of-the-galaxy-awesome-mix-vol-1',
    '{"id": "soundtracks-search-guardians-of-the-galaxy-awesome-mix-vol-1", "title": "Guardians of the Galaxy: Awesome Mix Vol. 1"}'::jsonb,
    110,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-pulp-fiction',
    '{"id": "soundtracks-search-pulp-fiction", "title": "Pulp Fiction"}'::jsonb,
    120,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-o-brother-where-art-thou',
    '{"id": "soundtracks-search-o-brother-where-art-thou", "title": "O Brother, Where Art Thou?"}'::jsonb,
    130,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-forrest-gump',
    '{"id": "soundtracks-search-forrest-gump", "title": "Forrest Gump"}'::jsonb,
    140,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-the-big-chill',
    '{"id": "soundtracks-search-the-big-chill", "title": "The Big Chill"}'::jsonb,
    150,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-waiting-to-exhale',
    '{"id": "soundtracks-search-waiting-to-exhale", "title": "Waiting to Exhale"}'::jsonb,
    160,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-space-jam',
    '{"id": "soundtracks-search-space-jam", "title": "Space Jam"}'::jsonb,
    170,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-the-crow',
    '{"id": "soundtracks-search-the-crow", "title": "The Crow"}'::jsonb,
    180,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-trainspotting',
    '{"id": "soundtracks-search-trainspotting", "title": "Trainspotting"}'::jsonb,
    190,
    true
  ),
  (
    'albums-type-soundtracks',
    'soundtracks-search-dazed-and-confused',
    '{"id": "soundtracks-search-dazed-and-confused", "title": "Dazed and Confused"}'::jsonb,
    200,
    true
  )
on conflict (option_id, item_id)
do update set
  item = excluded.item,
  display_order = excluded.display_order,
  active = excluded.active;
