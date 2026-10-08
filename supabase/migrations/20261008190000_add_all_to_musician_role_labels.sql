update public.collection_options
set name = case id
  when 'artists-type-vocalists' then 'All Vocalists'
  when 'artists-type-guitarists' then 'All Guitarists'
  when 'artists-type-drummers' then 'All Drummers'
  when 'artists-type-bassists' then 'All Bassists'
  when 'artists-type-mcs' then 'All MCs'
  when 'artists-type-djs' then 'All DJs'
end
where id in (
  'artists-type-vocalists',
  'artists-type-guitarists',
  'artists-type-drummers',
  'artists-type-bassists',
  'artists-type-mcs',
  'artists-type-djs'
);
