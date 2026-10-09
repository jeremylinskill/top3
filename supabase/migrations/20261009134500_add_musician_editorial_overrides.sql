-- Optional editorial overrides for musician catalogue records.
-- NULL preserves the existing automatic behaviour.

alter table public.musicians
  add column image_url_override text,
  add column preview_artist_id_override text,
  add column byline_override text;

alter table public.musicians
  add constraint musicians_byline_override_length_check
  check (
    byline_override is null
    or char_length(byline_override) <= 200
  );

alter table public.musicians
  add constraint musicians_preview_artist_override_format_check
  check (
    preview_artist_id_override is null
    or preview_artist_id_override ~ '^[0-9]+$'
  );

comment on column public.musicians.image_url_override
  is 'Optional musician photograph URL; takes priority over Apple Music artwork.';

comment on column public.musicians.preview_artist_id_override
  is 'Optional Apple Music artist ID used as the preferred audio preview source.';

comment on column public.musicians.byline_override
  is 'Optional manually written musician byline, maximum 200 characters.';
