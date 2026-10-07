alter table public.collections
  add column if not exists theme_id text;

create index if not exists collections_theme_id_idx
  on public.collections (theme_id)
  where theme_id is not null;
