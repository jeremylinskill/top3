-- Verified Apple Music connections.
-- Replays the 23 reviewed DEV connections.
-- Safe to rerun when IDs are already correctly assigned.

begin;

create temporary table verified_musician_connections (
  musician_id text primary key,
  musician_name text not null,
  artist_id text not null unique
) on commit drop;

insert into verified_musician_connections
  (musician_id, musician_name, artist_id)
values
  ('musician-albert-hammond-jr', 'Albert Hammond Jr.', '3128863'),
  ('musician-andrew-weatherall', 'Andrew Weatherall', '673274253'),
  ('musician-andy-summers', 'Andy Summers', '271685'),
  ('musician-anita-o-day', 'Anita O''Day', '139434'),
  ('musician-anni-frid-lyngstad', 'Anni-Frid Lyngstad', '68210656'),
  ('musician-art-garfunkel', 'Art Garfunkel', '269000'),
  ('musician-benny-greb', 'Benny Greb', '125403038'),
  ('musician-carl-palmer', 'Carl Palmer', '68095141'),
  ('musician-cecilia-bartoli', 'Cecilia Bartoli', '5633841'),
  ('musician-cindy-blackman-santana', 'Cindy Blackman Santana', '48685064'),
  ('musician-clyde-stubblefield', 'Clyde Stubblefield', '13545286'),
  ('musician-cuebrick', 'Cuebrick', '497690613'),
  ('musician-dave-mustaine', 'Dave Mustaine', '488293'),
  ('musician-dave-navarro', 'Dave Navarro', '564500'),
  ('musician-david-coverdale', 'David Coverdale', '13563857'),
  ('musician-debbie-reynolds', 'Debbie Reynolds', '17129939'),
  ('musician-derek-bailey', 'Derek Bailey', '216632558'),
  ('musician-donita-sparks', 'Donita Sparks', '193500974'),
  ('musician-ernest-ranglin', 'Ernest Ranglin', '121759'),
  ('musician-faustix', 'Faustix', '351239911'),
  ('musician-joey-jordison', 'Joey Jordison', '56158628'),
  ('musician-norman-jay-mbe', 'Norman Jay MBE', '351240301'),
  ('musician-pete-cosey', 'Pete Cosey', '16067999');

do $guard$
begin
  if (select count(*) from verified_musician_connections) <> 23 then
    raise exception 'Expected 23 verified connections';
  end if;

  if exists (
    select 1
    from verified_musician_connections v
    left join public.musicians m on m.id = v.musician_id
    where m.id is null
       or m.name is distinct from v.musician_name
       or m.active is distinct from true
  ) then
    raise exception 'Musician record validation failed';
  end if;

  if exists (
    select 1
    from verified_musician_connections v
    join public.musicians m on m.id = v.musician_id
    where m.apple_music_artist_id is not null
      and m.apple_music_artist_id <> v.artist_id
  ) then
    raise exception 'Existing artist ID conflict';
  end if;

  if exists (
    select 1
    from verified_musician_connections v
    join public.musicians m
      on m.apple_music_artist_id = v.artist_id
    where m.id <> v.musician_id
  ) then
    raise exception 'Artist ID belongs to another musician';
  end if;

  update public.musicians m
  set apple_music_artist_id = v.artist_id,
      updated_at = now()
  from verified_musician_connections v
  where m.id = v.musician_id
    and m.apple_music_artist_id is null;

  if (
    select count(*)
    from verified_musician_connections v
    join public.musicians m
      on m.id = v.musician_id
     and m.apple_music_artist_id = v.artist_id
  ) <> 23 then
    raise exception 'Final verification failed';
  end if;

  raise notice 'Verified all 23 Apple Music connections';
end
$guard$;

commit;
