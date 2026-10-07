update public.collections
set theme_id = case lower(trim(topic))
  when 'comfort movies' then 'comfort-movies'
  when 'movies i never get tired of' then 'never-get-tired-of'
  when 'tom cruise movies' then 'tom-cruise-movies'
  when 'netflix movies' then 'netflix-movies'
  when '1980s movies' then '1980s-movies'
  when 'a24 movies' then 'a24-movies'
  when 'movies that made me cry' then 'movies-that-made-me-cry'
  when 'movies i wish i could see again for the first time' then 'see-again-first-time'
  else theme_id
end
where lower(trim(category)) = 'movies'
  and theme_id is null
  and lower(trim(topic)) in (
    'comfort movies',
    'movies i never get tired of',
    'tom cruise movies',
    'netflix movies',
    '1980s movies',
    'a24 movies',
    'movies that made me cry',
    'movies i wish i could see again for the first time'
  );
