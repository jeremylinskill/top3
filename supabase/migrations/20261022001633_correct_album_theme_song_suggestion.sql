-- Replace a song-only search suggestion with an album.
-- Development first; Production requires separate approval.
-- Preserve the previously applied migration history.

begin;

do $$
declare
  updated_count integer;
begin
  if (
    select count(*)
    from public.collection_option_suggestions
    where option_id =
      'albums-theme-albums-that-got-me-through-tough-times'
      and item_id =
      'album-theme-search-albums-that-got-me-through-tough-times-14'
      and item->>'title' = 'The Night We Met'
  ) <> 1 then
    raise exception 'Original Album Theme suggestion not found';
  end if;

  update public.collection_option_suggestions
  set item = jsonb_set(
    item,
    '{title}',
    to_jsonb('Stranger in the Alps'::text)
  )
  where option_id =
    'albums-theme-albums-that-got-me-through-tough-times'
    and item_id =
    'album-theme-search-albums-that-got-me-through-tough-times-14';

  get diagnostics updated_count = row_count;

  if updated_count <> 1 then
    raise exception 'Expected exactly one suggestion update';
  end if;
end
$$;

commit;
