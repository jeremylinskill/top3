-- Add Live Albums as an Album Type.
-- Development first. No existing Lists are modified.

insert into public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
values (
  'albums-type-live',
  'live',
  'albums',
  'type',
  'Live Albums',
  'format',
  'Albums recorded during live performances',
  array['live', 'concert', 'unplugged', 'live album'],
  array['Live albums', 'Concert recordings'],
  false,
  false,
  true,
  30,
  'album',
  null,
  'curated',
  '{}'::jsonb
)
on conflict (id) do nothing;
