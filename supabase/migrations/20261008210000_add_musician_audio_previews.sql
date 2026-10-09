-- Cache verified playable recordings for curated musicians.
-- Keep canonical musician identities separate from recording artists.

create table public.musician_audio_previews (
  musician_id text primary key
    references public.musicians(id)
    on delete cascade,

  status text not null
    check (status in ('available', 'unavailable')),

  source_type text
    check (source_type in ('solo', 'band')),

  recording_artist_id text,
  recording_artist_name text,
  apple_music_song_id text,
  song_title text,
  preview_url text,

  -- Required when a recording comes from a verified band.
  association_source text,

  checked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint musician_audio_previews_available_check
    check (
      status = 'unavailable'
      or (
        source_type is not null
        and nullif(btrim(recording_artist_id), '') is not null
        and nullif(btrim(recording_artist_name), '') is not null
        and nullif(btrim(apple_music_song_id), '') is not null
        and nullif(btrim(song_title), '') is not null
        and nullif(btrim(preview_url), '') is not null
      )
    ),

  constraint musician_audio_previews_band_check
    check (
      source_type is distinct from 'band'
      or nullif(btrim(association_source), '') is not null
    )
);

create index musician_audio_previews_expires_idx
  on public.musician_audio_previews (expires_at);

alter table public.musician_audio_previews
  enable row level security;

create policy musician_audio_previews_read
  on public.musician_audio_previews
  for select
  to anon, authenticated
  using (true);

grant select
  on public.musician_audio_previews
  to anon, authenticated;
