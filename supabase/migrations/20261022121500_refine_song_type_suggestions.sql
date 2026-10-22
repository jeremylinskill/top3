-- Consolidated Song Type suggestion quality improvements.
-- Sixteen corrections from Development Apple Music audits.
-- No user Lists are changed.
-- Development first.

do $migration$
declare
  updated_count integer;
begin
  with corrections(
    option_id,
    item_id,
    old_title,
    new_title
  ) as (
    values
    ('songs-type-acoustic', 'songs-type-acoustic-search-01', 'Layla (Unplugged)', 'Layla (Acoustic Live)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-02', 'Everlong (Acoustic)', 'Everlong (Acoustic Version)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-07', 'Yellow (Acoustic)', 'Nutshell (Unplugged)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-08', 'Chasing Cars (Acoustic)', 'The A Team (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-09', 'Zombie (Acoustic)', 'Zombie (Acoustic Version)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-10', 'Use Somebody (Acoustic)', 'She Will Be Loved (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-11', 'The Scientist (Acoustic)', 'Drive (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-12', 'Wonderwall (Acoustic)', 'Wonderwall (Unplugged)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-14', 'Riptide (Acoustic)', 'Misery Business (Acoustic)'),
    ('songs-type-acoustic', 'songs-type-acoustic-search-15', 'Stay (Acoustic)', 'All Apologies (Unplugged)'),
    ('songs-type-live', 'songs-type-live-search-01', 'Purple Rain (Live)', 'Alive (Live)'),
    ('songs-type-live', 'songs-type-live-search-05', 'Everlong (Live)', 'Everlong (Live Acoustic 2006)'),
    ('songs-type-live', 'songs-type-live-search-10', 'Fast Car (Live)', 'The River (Live)'),
    ('songs-type-live', 'songs-type-live-search-13', 'Layla (Unplugged)', 'Nothing Else Matters (Live)'),
    ('songs-type-remixes', 'songs-type-remixes-search-08', 'Blue Monday (Hardfloor Remix)', 'Midnight City (Eric Prydz Private Remix)'),
    ('songs-type-remixes', 'songs-type-remixes-search-13', 'Bad Guy (Tiësto Remix)', 'Titanium (Alesso Remix)')
  )
  update public.collection_option_suggestions as s
  set item =
    (s.item - 'searchQuery') ||
    jsonb_build_object('title', c.new_title)
  from corrections as c
  where s.option_id = c.option_id
    and s.item_id = c.item_id
    and s.item->>'title' = c.old_title;

  get diagnostics updated_count = row_count;

  if updated_count <> 16 then
    raise exception
      'Expected 16 suggestion corrections; updated %',
      updated_count;
  end if;
end
$migration$;
