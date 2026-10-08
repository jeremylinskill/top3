alter table public.artist_preview_bylines
  rename to media_preview_bylines;

alter table public.media_preview_bylines
  rename column apple_music_artist_id
  to apple_music_item_id;

alter table public.media_preview_bylines
  rename column artist_name
  to title;

alter table public.media_preview_bylines
  rename column source_artist_id
  to source_entity_id;

alter table public.media_preview_bylines
  add column entity_kind text not null default 'artist',
  add column artist_name text,
  add column album_name text;

alter table public.media_preview_bylines
  alter column entity_kind drop default;

alter table public.media_preview_bylines
  drop constraint artist_preview_bylines_pkey,
  drop constraint artist_preview_bylines_artist_id_check,
  drop constraint artist_preview_bylines_artist_name_check;

alter table public.media_preview_bylines
  add constraint media_preview_bylines_pkey
    primary key (
      entity_kind,
      apple_music_item_id
    ),

  add constraint media_preview_bylines_entity_kind_check
    check (
      entity_kind in (
        'artist',
        'album',
        'song'
      )
    ),

  add constraint media_preview_bylines_item_id_check
    check (
      apple_music_item_id ~ '^[0-9]+$'
    ),

  add constraint media_preview_bylines_title_check
    check (
      btrim(title) <> ''
    ),

  add constraint media_preview_bylines_artist_name_check
    check (
      artist_name is null
      or btrim(artist_name) <> ''
    ),

  add constraint media_preview_bylines_album_name_check
    check (
      album_name is null
      or btrim(album_name) <> ''
    );

alter index public.artist_preview_bylines_artist_name_idx
  rename to media_preview_bylines_title_idx;

drop trigger set_artist_preview_bylines_updated_at
  on public.media_preview_bylines;

drop function public.set_artist_preview_byline_updated_at();

create or replace function public.set_media_preview_byline_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create trigger set_media_preview_bylines_updated_at
  before update on public.media_preview_bylines
  for each row
  execute function public.set_media_preview_byline_updated_at();

create index media_preview_bylines_artist_name_idx
  on public.media_preview_bylines (
    entity_kind,
    lower(artist_name)
  )
  where artist_name is not null;

grant select, insert, update, delete
  on table public.media_preview_bylines
  to service_role;
