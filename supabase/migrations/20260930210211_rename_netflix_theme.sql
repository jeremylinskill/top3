update public.collections
set
  theme_id = 'netflix-originals',
  topic = 'Netflix Originals',
  title = case
    when title = 'Top 3 Netflix Movies'
      then 'Top 3 Netflix Originals'
    else title
  end
where theme_id = 'netflix-movies';
