-- Display song titles only in suggestion chips.
-- Preserve full Apple Music searches separately.
-- Development first; no existing Lists are modified.

do $migration$
declare
  updated_count integer;
begin
  with corrections (
    option_id,
    item_id,
    display_title
  ) as (
    values
      ('songs-type-acoustic', 'songs-type-acoustic-search-01', 'Layla'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-02', 'Everlong'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-03', 'Take On Me'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-04', 'Black'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-05', 'Times Like These'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-06', 'Iris'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-07', 'Yellow'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-08', 'Chasing Cars'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-09', 'Zombie'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-10', 'Use Somebody'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-11', 'The Scientist'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-12', 'Wonderwall'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-13', 'Creep'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-14', 'Riptide'),
      ('songs-type-acoustic', 'songs-type-acoustic-search-15', 'Stay'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-01', 'Shallow'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-02', 'Under Pressure'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-03', 'Empire State of Mind'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-04', 'The Boy Is Mine'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-05', 'Say Say Say'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-06', 'Dancing in the Street'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-07', 'Endless Love'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-08', 'Islands in the Stream'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-09', 'Uptown Funk'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-10', 'Somebody That I Used to Know'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-11', 'Señorita'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-12', 'Stay'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-13', 'Save Your Tears'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-14', 'Nothin'' on You'),
      ('songs-type-collaborations', 'songs-type-collaborations-search-15', 'Telephone'),
      ('songs-type-live', 'songs-type-live-search-01', 'Purple Rain'),
      ('songs-type-live', 'songs-type-live-search-02', 'Hotel California'),
      ('songs-type-live', 'songs-type-live-search-03', 'Free Bird'),
      ('songs-type-live', 'songs-type-live-search-04', 'Comfortably Numb'),
      ('songs-type-live', 'songs-type-live-search-05', 'Everlong'),
      ('songs-type-live', 'songs-type-live-search-06', 'Black'),
      ('songs-type-live', 'songs-type-live-search-07', 'With or Without You'),
      ('songs-type-live', 'songs-type-live-search-08', 'Fix You'),
      ('songs-type-live', 'songs-type-live-search-09', 'All Along the Watchtower'),
      ('songs-type-live', 'songs-type-live-search-10', 'Fast Car'),
      ('songs-type-live', 'songs-type-live-search-11', 'Bohemian Rhapsody'),
      ('songs-type-live', 'songs-type-live-search-12', 'Stairway to Heaven'),
      ('songs-type-live', 'songs-type-live-search-13', 'Layla'),
      ('songs-type-live', 'songs-type-live-search-14', 'No Woman No Cry'),
      ('songs-type-live', 'songs-type-live-search-15', 'Thunderstruck'),
      ('songs-type-remixes', 'songs-type-remixes-search-01', 'Summertime Sadness'),
      ('songs-type-remixes', 'songs-type-remixes-search-02', 'Roses'),
      ('songs-type-remixes', 'songs-type-remixes-search-03', 'I Took a Pill in Ibiza'),
      ('songs-type-remixes', 'songs-type-remixes-search-04', 'Prayer in C'),
      ('songs-type-remixes', 'songs-type-remixes-search-05', 'Waves'),
      ('songs-type-remixes', 'songs-type-remixes-search-06', 'Heads Will Roll'),
      ('songs-type-remixes', 'songs-type-remixes-search-07', 'Missing'),
      ('songs-type-remixes', 'songs-type-remixes-search-08', 'Blue Monday'),
      ('songs-type-remixes', 'songs-type-remixes-search-09', 'Save Your Tears'),
      ('songs-type-remixes', 'songs-type-remixes-search-10', 'Levitating'),
      ('songs-type-remixes', 'songs-type-remixes-search-11', 'Old Town Road'),
      ('songs-type-remixes', 'songs-type-remixes-search-12', 'Calm Down'),
      ('songs-type-remixes', 'songs-type-remixes-search-13', 'Bad Guy'),
      ('songs-type-remixes', 'songs-type-remixes-search-14', 'Silence'),
      ('songs-type-remixes', 'songs-type-remixes-search-15', 'Stayin'' Alive')
  )
  update public.collection_option_suggestions as s
  set item = s.item || jsonb_build_object(
    'title', corrections.display_title,
    'searchQuery', s.item->>'title'
  )
  from corrections
  where s.option_id = corrections.option_id
    and s.item_id = corrections.item_id
    and s.item->>'title' is not null
    and s.item->>'title' <> corrections.display_title;

  get diagnostics updated_count = row_count;

  if updated_count <> 60 then
    raise exception
      'Expected 60 Song suggestion updates, applied %',
      updated_count;
  end if;
end
$migration$;
