create table public.artist_preview_bylines (
  apple_music_artist_id text primary key,
  artist_name text not null,
  byline text not null,

  source_provider text not null,
  source_artist_id text,

  generator_provider text not null,
  generator_model text not null,
  generator_version text not null,

  manually_edited boolean not null default false,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint artist_preview_bylines_artist_id_check
    check (
      apple_music_artist_id ~ '^[0-9]+$'
    ),

  constraint artist_preview_bylines_artist_name_check
    check (
      btrim(artist_name) <> ''
    ),

  constraint artist_preview_bylines_byline_check
    check (
      btrim(byline) <> ''
    ),

  constraint artist_preview_bylines_source_provider_check
    check (
      btrim(source_provider) <> ''
    ),

  constraint artist_preview_bylines_generator_provider_check
    check (
      btrim(generator_provider) <> ''
    ),

  constraint artist_preview_bylines_generator_model_check
    check (
      btrim(generator_model) <> ''
    ),

  constraint artist_preview_bylines_generator_version_check
    check (
      btrim(generator_version) <> ''
    )
);

alter table public.artist_preview_bylines
  enable row level security;

create index artist_preview_bylines_artist_name_idx
  on public.artist_preview_bylines (
    lower(artist_name)
  );

create or replace function public.set_artist_preview_byline_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create trigger set_artist_preview_bylines_updated_at
  before update on public.artist_preview_bylines
  for each row
  execute function public.set_artist_preview_byline_updated_at();
