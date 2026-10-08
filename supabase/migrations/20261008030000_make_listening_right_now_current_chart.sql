update public.collection_options
set
  provider_key = 'apple_music',
  provider_mode = 'current_chart',
  provider_config = '{}'::jsonb,
  updated_at = now()
where id = 'artists-theme-listening-right-now';
