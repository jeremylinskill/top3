-- Align Song suggestion labels and search text.
-- Development only. No user Lists are modified.

do $migration$
declare
  updated_count integer;
begin
  with corrections(option_id, item_id, display_title) as (
    values
    ('songs-type-acoustic', 'songs-type-acoustic-search-01', 'Layla (Unplugged)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-02', 'Everlong (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-03', 'Take On Me (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-04', 'Black (Unplugged)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-05', 'Times Like These (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-06', 'Iris (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-07', 'Yellow (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-08', 'Chasing Cars (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-09', 'Zombie (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-10', 'Use Somebody (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-11', 'The Scientist (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-12', 'Wonderwall (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-13', 'Creep (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-14', 'Riptide (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-15', 'Stay (Acoustic)'),
    ('songs-type-live', 'songs-type-live-search-01', 'Purple Rain (Live)'),
    ('songs-type-live', 'songs-type-live-search-02', 'Hotel California (Live)'),
    ('songs-type-live', 'songs-type-live-search-03', 'Free Bird (Live)'),
    ('songs-type-live', 'songs-type-live-search-04', 'Comfortably Numb (Live)'),
    ('songs-type-live', 'songs-type-live-search-05', 'Everlong (Live)'),
    ('songs-type-live', 'songs-type-live-search-06', 'Black (Unplugged)'),
    ('songs-type-live', 'songs-type-live-search-07', 'With or Without You (Live)'),
    ('songs-type-live', 'songs-type-live-search-08', 'Fix You (Live)'),
    ('songs-type-live', 'songs-type-live-search-09', 'All Along the Watchtower (Live)'),
    ('songs-type-live', 'songs-type-live-search-10', 'Fast Car (Live)'),
    ('songs-type-live', 'songs-type-live-search-11', 'Bohemian Rhapsody (Live)'),
    ('songs-type-live', 'songs-type-live-search-12', 'Stairway to Heaven (Live)'),
    ('songs-type-live', 'songs-type-live-search-13', 'Layla (Unplugged)'),
    ('songs-type-live', 'songs-type-live-search-14', 'No Woman No Cry (Live)'),
    ('songs-type-live', 'songs-type-live-search-15', 'Thunderstruck (Live)'),
    ('songs-type-remixes', 'songs-type-remixes-search-01', 'Summertime Sadness (Cedric Gervais Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-02', 'Roses (Imanbek Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-03', 'I Took a Pill in Ibiza (Seeb Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-04', 'Prayer in C (Robin Schulz Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-05', 'Waves (Robin Schulz Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-06', 'Heads Will Roll (A-Trak Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-07', 'Missing (Todd Terry Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-08', 'Blue Monday (Hardfloor Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-09', 'Save Your Tears (Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-10', 'Levitating (The Blessed Madonna Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-11', 'Old Town Road (Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-12', 'Calm Down (Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-13', 'Bad Guy (Tiësto Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-14', 'Silence (Tiësto Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-15', 'Stayin'' Alive (Remix)'),
    ('songs-type-collaborations', 'songs-type-collaborations-search-01', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-02', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-03', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-04', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-05', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-06', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-07', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-08', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-09', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-10', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-11', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-12', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-13', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-14', null::text),
    ('songs-type-collaborations', 'songs-type-collaborations-search-15', null::text)
  )
  update public.collection_option_suggestions as s
  set item =
    (s.item - 'searchQuery') ||
    jsonb_build_object(
      'title',
      coalesce(c.display_title, s.item->>'title')
    )
  from corrections as c
  where s.option_id = c.option_id
    and s.item_id = c.item_id
    and s.item ? 'searchQuery'
    and nullif(s.item->>'title', '') is not null;

  get diagnostics updated_count = row_count;

  if updated_count <> 60 then
    raise exception
      'Expected 60 updated suggestions, found %',
      updated_count;
  end if;
end
$migration$;
