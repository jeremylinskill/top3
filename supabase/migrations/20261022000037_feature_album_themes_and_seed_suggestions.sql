-- Hybrid Featured Album Themes and curated search prompts.
-- Development first; Production requires separate approval.
-- All nine Album Themes become eligible for Trending.
-- Five remain editorial Featured defaults.
-- Suggestions are search prompts, not objective rankings.
-- Existing user Lists are not modified.

begin;

do $$
begin
  if (
    select count(*)
    from public.collection_options
    where id = any(array['albums-theme-no-skip-albums', 'albums-theme-albums-that-changed-my-life', 'albums-theme-most-underrated-albums', 'albums-theme-albums-that-defined-my-youth', 'albums-theme-best-album-artwork', 'albums-theme-guilty-pleasure-albums', 'albums-theme-perfect-road-trip-albums', 'albums-theme-albums-that-got-me-through-tough-times', 'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time'])
      and category_id = 'albums'
      and kind = 'theme'
  ) <> 9 then
    raise exception 'Expected all nine Album Themes';
  end if;
end
$$;

update public.collection_options
set
  featured = id = any(array['albums-theme-no-skip-albums', 'albums-theme-albums-that-changed-my-life', 'albums-theme-most-underrated-albums', 'albums-theme-albums-that-defined-my-youth', 'albums-theme-best-album-artwork']),
  trending_enabled = true
where id = any(array['albums-theme-no-skip-albums', 'albums-theme-albums-that-changed-my-life', 'albums-theme-most-underrated-albums', 'albums-theme-albums-that-defined-my-youth', 'albums-theme-best-album-artwork', 'albums-theme-guilty-pleasure-albums', 'albums-theme-perfect-road-trip-albums', 'albums-theme-albums-that-got-me-through-tough-times', 'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time'])
  and category_id = 'albums'
  and kind = 'theme';

insert into public.collection_option_suggestions (
  option_id,
  item_id,
  item,
  display_order,
  active
)
values
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-01',
    '{"id": "album-theme-search-no-skip-albums-01", "title": "Rumours"}'::jsonb,
    10,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-02',
    '{"id": "album-theme-search-no-skip-albums-02", "title": "Abbey Road"}'::jsonb,
    20,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-03',
    '{"id": "album-theme-search-no-skip-albums-03", "title": "Thriller"}'::jsonb,
    30,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-04',
    '{"id": "album-theme-search-no-skip-albums-04", "title": "OK Computer"}'::jsonb,
    40,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-05',
    '{"id": "album-theme-search-no-skip-albums-05", "title": "Songs in the Key of Life"}'::jsonb,
    50,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-06',
    '{"id": "album-theme-search-no-skip-albums-06", "title": "Back to Black"}'::jsonb,
    60,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-07',
    '{"id": "album-theme-search-no-skip-albums-07", "title": "The Miseducation of Lauryn Hill"}'::jsonb,
    70,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-08',
    '{"id": "album-theme-search-no-skip-albums-08", "title": "Random Access Memories"}'::jsonb,
    80,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-09',
    '{"id": "album-theme-search-no-skip-albums-09", "title": "Blue"}'::jsonb,
    90,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-10',
    '{"id": "album-theme-search-no-skip-albums-10", "title": "To Pimp a Butterfly"}'::jsonb,
    100,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-11',
    '{"id": "album-theme-search-no-skip-albums-11", "title": "Purple Rain"}'::jsonb,
    110,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-12',
    '{"id": "album-theme-search-no-skip-albums-12", "title": "Melodrama"}'::jsonb,
    120,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-13',
    '{"id": "album-theme-search-no-skip-albums-13", "title": "Aja"}'::jsonb,
    130,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-14',
    '{"id": "album-theme-search-no-skip-albums-14", "title": "Currents"}'::jsonb,
    140,
    true
  ),
  (
    'albums-theme-no-skip-albums',
    'album-theme-search-no-skip-albums-15',
    '{"id": "album-theme-search-no-skip-albums-15", "title": "In Rainbows"}'::jsonb,
    150,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-01',
    '{"id": "album-theme-search-albums-that-changed-my-life-01", "title": "The Joshua Tree"}'::jsonb,
    10,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-02',
    '{"id": "album-theme-search-albums-that-changed-my-life-02", "title": "Nevermind"}'::jsonb,
    20,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-03',
    '{"id": "album-theme-search-albums-that-changed-my-life-03", "title": "Jagged Little Pill"}'::jsonb,
    30,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-04',
    '{"id": "album-theme-search-albums-that-changed-my-life-04", "title": "The Wall"}'::jsonb,
    40,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-05',
    '{"id": "album-theme-search-albums-that-changed-my-life-05", "title": "The Suburbs"}'::jsonb,
    50,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-06',
    '{"id": "album-theme-search-albums-that-changed-my-life-06", "title": "Blue"}'::jsonb,
    60,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-07',
    '{"id": "album-theme-search-albums-that-changed-my-life-07", "title": "The College Dropout"}'::jsonb,
    70,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-08',
    '{"id": "album-theme-search-albums-that-changed-my-life-08", "title": "Folklore"}'::jsonb,
    80,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-09',
    '{"id": "album-theme-search-albums-that-changed-my-life-09", "title": "Born to Run"}'::jsonb,
    90,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-10',
    '{"id": "album-theme-search-albums-that-changed-my-life-10", "title": "Lemonade"}'::jsonb,
    100,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-11',
    '{"id": "album-theme-search-albums-that-changed-my-life-11", "title": "In Rainbows"}'::jsonb,
    110,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-12',
    '{"id": "album-theme-search-albums-that-changed-my-life-12", "title": "The ArchAndroid"}'::jsonb,
    120,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-13',
    '{"id": "album-theme-search-albums-that-changed-my-life-13", "title": "good kid, m.A.A.d city"}'::jsonb,
    130,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-14',
    '{"id": "album-theme-search-albums-that-changed-my-life-14", "title": "The Freewheelin'' Bob Dylan"}'::jsonb,
    140,
    true
  ),
  (
    'albums-theme-albums-that-changed-my-life',
    'album-theme-search-albums-that-changed-my-life-15',
    '{"id": "album-theme-search-albums-that-changed-my-life-15", "title": "Punisher"}'::jsonb,
    150,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-01',
    '{"id": "album-theme-search-most-underrated-albums-01", "title": "Either/Or"}'::jsonb,
    10,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-02',
    '{"id": "album-theme-search-most-underrated-albums-02", "title": "Pink Moon"}'::jsonb,
    20,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-03',
    '{"id": "album-theme-search-most-underrated-albums-03", "title": "The Moon & Antarctica"}'::jsonb,
    30,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-04',
    '{"id": "album-theme-search-most-underrated-albums-04", "title": "Transatlanticism"}'::jsonb,
    40,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-05',
    '{"id": "album-theme-search-most-underrated-albums-05", "title": "The Sunset Tree"}'::jsonb,
    50,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-06',
    '{"id": "album-theme-search-most-underrated-albums-06", "title": "Southeastern"}'::jsonb,
    60,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-07',
    '{"id": "album-theme-search-most-underrated-albums-07", "title": "The Sophtware Slump"}'::jsonb,
    70,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-08',
    '{"id": "album-theme-search-most-underrated-albums-08", "title": "The Wild Hunt"}'::jsonb,
    80,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-09',
    '{"id": "album-theme-search-most-underrated-albums-09", "title": "The Reminder"}'::jsonb,
    90,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-10',
    '{"id": "album-theme-search-most-underrated-albums-10", "title": "I Am Easy to Find"}'::jsonb,
    100,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-11',
    '{"id": "album-theme-search-most-underrated-albums-11", "title": "The Midnight Organ Fight"}'::jsonb,
    110,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-12',
    '{"id": "album-theme-search-most-underrated-albums-12", "title": "Veckatimest"}'::jsonb,
    120,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-13',
    '{"id": "album-theme-search-most-underrated-albums-13", "title": "Age of Adz"}'::jsonb,
    130,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-14',
    '{"id": "album-theme-search-most-underrated-albums-14", "title": "Kaputt"}'::jsonb,
    140,
    true
  ),
  (
    'albums-theme-most-underrated-albums',
    'album-theme-search-most-underrated-albums-15',
    '{"id": "album-theme-search-most-underrated-albums-15", "title": "The Party"}'::jsonb,
    150,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-01',
    '{"id": "album-theme-search-albums-that-defined-my-youth-01", "title": "Sgt. Pepper''s Lonely Hearts Club Band"}'::jsonb,
    10,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-02',
    '{"id": "album-theme-search-albums-that-defined-my-youth-02", "title": "Thriller"}'::jsonb,
    20,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-03',
    '{"id": "album-theme-search-albums-that-defined-my-youth-03", "title": "Dookie"}'::jsonb,
    30,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-04',
    '{"id": "album-theme-search-albums-that-defined-my-youth-04", "title": "Jagged Little Pill"}'::jsonb,
    40,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-05',
    '{"id": "album-theme-search-albums-that-defined-my-youth-05", "title": "Nevermind"}'::jsonb,
    50,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-06',
    '{"id": "album-theme-search-albums-that-defined-my-youth-06", "title": "Spice"}'::jsonb,
    60,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-07',
    '{"id": "album-theme-search-albums-that-defined-my-youth-07", "title": "Hybrid Theory"}'::jsonb,
    70,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-08',
    '{"id": "album-theme-search-albums-that-defined-my-youth-08", "title": "The Eminem Show"}'::jsonb,
    80,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-09',
    '{"id": "album-theme-search-albums-that-defined-my-youth-09", "title": "Fearless"}'::jsonb,
    90,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-10',
    '{"id": "album-theme-search-albums-that-defined-my-youth-10", "title": "Sour"}'::jsonb,
    100,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-11',
    '{"id": "album-theme-search-albums-that-defined-my-youth-11", "title": "Purple Rain"}'::jsonb,
    110,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-12',
    '{"id": "album-theme-search-albums-that-defined-my-youth-12", "title": "American Idiot"}'::jsonb,
    120,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-13',
    '{"id": "album-theme-search-albums-that-defined-my-youth-13", "title": "The Marshall Mathers LP"}'::jsonb,
    130,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-14',
    '{"id": "album-theme-search-albums-that-defined-my-youth-14", "title": "1989"}'::jsonb,
    140,
    true
  ),
  (
    'albums-theme-albums-that-defined-my-youth',
    'album-theme-search-albums-that-defined-my-youth-15',
    '{"id": "album-theme-search-albums-that-defined-my-youth-15", "title": "Enema of the State"}'::jsonb,
    150,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-01',
    '{"id": "album-theme-search-best-album-artwork-01", "title": "The Dark Side of the Moon"}'::jsonb,
    10,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-02',
    '{"id": "album-theme-search-best-album-artwork-02", "title": "Abbey Road"}'::jsonb,
    20,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-03',
    '{"id": "album-theme-search-best-album-artwork-03", "title": "Sgt. Pepper''s Lonely Hearts Club Band"}'::jsonb,
    30,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-04',
    '{"id": "album-theme-search-best-album-artwork-04", "title": "Unknown Pleasures"}'::jsonb,
    40,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-05',
    '{"id": "album-theme-search-best-album-artwork-05", "title": "Aladdin Sane"}'::jsonb,
    50,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-06',
    '{"id": "album-theme-search-best-album-artwork-06", "title": "The Velvet Underground & Nico"}'::jsonb,
    60,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-07',
    '{"id": "album-theme-search-best-album-artwork-07", "title": "London Calling"}'::jsonb,
    70,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-08',
    '{"id": "album-theme-search-best-album-artwork-08", "title": "To Pimp a Butterfly"}'::jsonb,
    80,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-09',
    '{"id": "album-theme-search-best-album-artwork-09", "title": "Currents"}'::jsonb,
    90,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-10',
    '{"id": "album-theme-search-best-album-artwork-10", "title": "Melodrama"}'::jsonb,
    100,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-11',
    '{"id": "album-theme-search-best-album-artwork-11", "title": "Wish You Were Here"}'::jsonb,
    110,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-12',
    '{"id": "album-theme-search-best-album-artwork-12", "title": "Nevermind"}'::jsonb,
    120,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-13',
    '{"id": "album-theme-search-best-album-artwork-13", "title": "Horses"}'::jsonb,
    130,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-14',
    '{"id": "album-theme-search-best-album-artwork-14", "title": "The Bends"}'::jsonb,
    140,
    true
  ),
  (
    'albums-theme-best-album-artwork',
    'album-theme-search-best-album-artwork-15',
    '{"id": "album-theme-search-best-album-artwork-15", "title": "The Low End Theory"}'::jsonb,
    150,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-01',
    '{"id": "album-theme-search-guilty-pleasure-albums-01", "title": "Aquarium"}'::jsonb,
    10,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-02',
    '{"id": "album-theme-search-guilty-pleasure-albums-02", "title": "Spice"}'::jsonb,
    20,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-03',
    '{"id": "album-theme-search-guilty-pleasure-albums-03", "title": "Millennium"}'::jsonb,
    30,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-04',
    '{"id": "album-theme-search-guilty-pleasure-albums-04", "title": "Oops!... I Did It Again"}'::jsonb,
    40,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-05',
    '{"id": "album-theme-search-guilty-pleasure-albums-05", "title": "Let Go"}'::jsonb,
    50,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-06',
    '{"id": "album-theme-search-guilty-pleasure-albums-06", "title": "Teenage Dream"}'::jsonb,
    60,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-07',
    '{"id": "album-theme-search-guilty-pleasure-albums-07", "title": "Breakaway"}'::jsonb,
    70,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-08',
    '{"id": "album-theme-search-guilty-pleasure-albums-08", "title": "Bangerz"}'::jsonb,
    80,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-09',
    '{"id": "album-theme-search-guilty-pleasure-albums-09", "title": "Future Nostalgia"}'::jsonb,
    90,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-10',
    '{"id": "album-theme-search-guilty-pleasure-albums-10", "title": "High School Musical"}'::jsonb,
    100,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-11',
    '{"id": "album-theme-search-guilty-pleasure-albums-11", "title": "The Fame"}'::jsonb,
    110,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-12',
    '{"id": "album-theme-search-guilty-pleasure-albums-12", "title": "Confessions"}'::jsonb,
    120,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-13',
    '{"id": "album-theme-search-guilty-pleasure-albums-13", "title": "Believe"}'::jsonb,
    130,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-14',
    '{"id": "album-theme-search-guilty-pleasure-albums-14", "title": "No Strings Attached"}'::jsonb,
    140,
    true
  ),
  (
    'albums-theme-guilty-pleasure-albums',
    'album-theme-search-guilty-pleasure-albums-15',
    '{"id": "album-theme-search-guilty-pleasure-albums-15", "title": "The Dutchess"}'::jsonb,
    150,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-01',
    '{"id": "album-theme-search-perfect-road-trip-albums-01", "title": "Born to Run"}'::jsonb,
    10,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-02',
    '{"id": "album-theme-search-perfect-road-trip-albums-02", "title": "Rumours"}'::jsonb,
    20,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-03',
    '{"id": "album-theme-search-perfect-road-trip-albums-03", "title": "The Joshua Tree"}'::jsonb,
    30,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-04',
    '{"id": "album-theme-search-perfect-road-trip-albums-04", "title": "The Lumineers"}'::jsonb,
    40,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-05',
    '{"id": "album-theme-search-perfect-road-trip-albums-05", "title": "Golden Hour"}'::jsonb,
    50,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-06',
    '{"id": "album-theme-search-perfect-road-trip-albums-06", "title": "Harvest"}'::jsonb,
    60,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-07',
    '{"id": "album-theme-search-perfect-road-trip-albums-07", "title": "American Beauty"}'::jsonb,
    70,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-08',
    '{"id": "album-theme-search-perfect-road-trip-albums-08", "title": "Traveller"}'::jsonb,
    80,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-09',
    '{"id": "album-theme-search-perfect-road-trip-albums-09", "title": "The Suburbs"}'::jsonb,
    90,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-10',
    '{"id": "album-theme-search-perfect-road-trip-albums-10", "title": "Cleopatra"}'::jsonb,
    100,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-11',
    '{"id": "album-theme-search-perfect-road-trip-albums-11", "title": "Wilder Mind"}'::jsonb,
    110,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-12',
    '{"id": "album-theme-search-perfect-road-trip-albums-12", "title": "Babel"}'::jsonb,
    120,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-13',
    '{"id": "album-theme-search-perfect-road-trip-albums-13", "title": "Strange Trails"}'::jsonb,
    130,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-14',
    '{"id": "album-theme-search-perfect-road-trip-albums-14", "title": "Fleet Foxes"}'::jsonb,
    140,
    true
  ),
  (
    'albums-theme-perfect-road-trip-albums',
    'album-theme-search-perfect-road-trip-albums-15',
    '{"id": "album-theme-search-perfect-road-trip-albums-15", "title": "The River"}'::jsonb,
    150,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-01',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-01", "title": "For Emma, Forever Ago"}'::jsonb,
    10,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-02',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-02", "title": "21"}'::jsonb,
    20,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-03',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-03", "title": "Carrie & Lowell"}'::jsonb,
    30,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-04',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-04", "title": "Blue"}'::jsonb,
    40,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-05',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-05", "title": "Punisher"}'::jsonb,
    50,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-06',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-06", "title": "Folklore"}'::jsonb,
    60,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-07',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-07", "title": "After Laughter"}'::jsonb,
    70,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-08',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-08", "title": "Swimming"}'::jsonb,
    80,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-09',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-09", "title": "the record"}'::jsonb,
    90,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-10',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-10", "title": "Golden Hour"}'::jsonb,
    100,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-11',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-11", "title": "Hospice"}'::jsonb,
    110,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-12',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-12", "title": "A Crow Looked at Me"}'::jsonb,
    120,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-13',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-13", "title": "I Forget Where We Were"}'::jsonb,
    130,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-14',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-14", "title": "The Night We Met"}'::jsonb,
    140,
    true
  ),
  (
    'albums-theme-albums-that-got-me-through-tough-times',
    'album-theme-search-albums-that-got-me-through-tough-times-15',
    '{"id": "album-theme-search-albums-that-got-me-through-tough-times-15", "title": "Bon Iver"}'::jsonb,
    150,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-01',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-01", "title": "Kid A"}'::jsonb,
    10,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-02',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-02", "title": "The Dark Side of the Moon"}'::jsonb,
    20,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-03',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-03", "title": "In Rainbows"}'::jsonb,
    30,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-04',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-04", "title": "Discovery"}'::jsonb,
    40,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-05',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-05", "title": "Lemonade"}'::jsonb,
    50,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-06',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-06", "title": "Random Access Memories"}'::jsonb,
    60,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-07',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-07", "title": "Blonde"}'::jsonb,
    70,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-08',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-08", "title": "To Pimp a Butterfly"}'::jsonb,
    80,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-09',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-09", "title": "The Rise and Fall of Ziggy Stardust"}'::jsonb,
    90,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-10',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-10", "title": "A Love Supreme"}'::jsonb,
    100,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-11',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-11", "title": "OK Computer"}'::jsonb,
    110,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-12',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-12", "title": "The Miseducation of Lauryn Hill"}'::jsonb,
    120,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-13',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-13", "title": "The Downward Spiral"}'::jsonb,
    130,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-14',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-14", "title": "Songs in the Key of Life"}'::jsonb,
    140,
    true
  ),
  (
    'albums-theme-albums-i-wish-i-could-hear-again-for-the-first-time',
    'album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-15',
    '{"id": "album-theme-search-albums-i-wish-i-could-hear-again-for-the-first-time-15", "title": "Vespertine"}'::jsonb,
    150,
    true
  )
on conflict (option_id, item_id)
do update set
  item = excluded.item,
  display_order = excluded.display_order,
  active = excluded.active;

commit;
