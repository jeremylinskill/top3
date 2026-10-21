-- Add Soundtracks as an Album Type.
-- Does not modify or migrate existing Soundtrack genre lists.
-- Deploy only after confirming the target Supabase environment.

insert into public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
values (
  'albums-type-soundtracks',
  'soundtracks',
  'albums',
  'type',
  'Soundtracks',
  'format',
  'Albums created for films, television, games and other productions',
  array['soundtrack', 'soundtracks', 'original soundtrack', 'ost'],
  array['Soundtrack albums', 'Original scores'],
  false,
  false,
  true,
  10,
  'album',
  null,
  'curated',
  '{}'::jsonb
)
on conflict (id) do nothing;
