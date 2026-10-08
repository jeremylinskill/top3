alter table public.media_preview_bylines
  add column byline_kind text not null default 'item';

alter table public.media_preview_bylines
  alter column byline_kind drop default;

alter table public.media_preview_bylines
  add constraint media_preview_bylines_byline_kind_check
    check (
      byline_kind in (
        'item',
        'metadata',
        'artist_fallback'
      )
    );
