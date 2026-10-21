-- Add Compilations as an Album Type.
-- Does not change existing published Lists.
-- Apply to Development first.
-- Production promotion requires separate approval.

insert into public.collection_options (
  id, slug, category_id, kind, name,
  group_name, browse_label, keywords, search_hints,
  featured, trending_enabled, active, display_order,
  entity_kind, provider_key, provider_mode, provider_config
)
values (
  'albums-type-compilations',
  'compilations',
  'albums',
  'type',
  'Compilations',
  'format',
  'Collections of recordings from one or multiple artists',
  array[
    'compilation',
    'compilations',
    'various artists',
    'greatest hits'
  ],
  array[
    'Compilation albums',
    'Various artists compilations'
  ],
  false,
  false,
  true,
  20,
  'album',
  null,
  'curated',
  '{}'::jsonb
)
on conflict (id) do nothing;
