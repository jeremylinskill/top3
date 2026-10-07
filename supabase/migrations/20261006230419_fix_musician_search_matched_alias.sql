create or replace function public.search_musicians_by_role(
  p_role text,
  p_query text default '',
  p_limit integer default 20
)
returns table (
  id text,
  name text,
  sort_name text,
  apple_music_artist_id text,
  role text,
  role_rank integer,
  matched_alias text
)
language sql
stable
set search_path to ''
as $function$
  with params as (
    select
      lower(btrim(coalesce(p_query, ''))) as query,
      least(
        greatest(
          coalesce(p_limit, 20),
          1
        ),
        50
      ) as result_limit
  ),
  candidates as (
    select
      musician.id,
      musician.name,
      musician.sort_name,
      musician.apple_music_artist_id,
      musician_role.role,
      musician_role.rank as role_rank,

      case
        when params.query = ''
          then null::text

        else (
          select alias.alias
          from public.musician_aliases alias
          where
            alias.musician_id = musician.id
            and alias.active
            and alias.normalized_alias like
              '%' || params.query || '%'
          order by
            case
              when alias.normalized_alias =
                params.query
                then 0

              when alias.normalized_alias like
                params.query || '%'
                then 1

              else 2
            end,
            length(alias.normalized_alias),
            alias.alias
          limit 1
        )
      end as matched_alias,

      case
        when params.query = ''
          then 0

        when musician.normalized_name =
          params.query
          then 0

        when exists (
          select 1
          from public.musician_aliases alias
          where
            alias.musician_id = musician.id
            and alias.active
            and alias.normalized_alias =
              params.query
        )
          then 1

        when musician.normalized_name like
          params.query || '%'
          then 2

        when exists (
          select 1
          from public.musician_aliases alias
          where
            alias.musician_id = musician.id
            and alias.active
            and alias.normalized_alias like
              params.query || '%'
        )
          then 3

        when musician.normalized_name like
          '%' || params.query || '%'
          then 4

        when exists (
          select 1
          from public.musician_aliases alias
          where
            alias.musician_id = musician.id
            and alias.active
            and alias.normalized_alias like
              '%' || params.query || '%'
        )
          then 5

        else 6
      end as match_rank

    from public.musicians musician

    inner join public.musician_roles musician_role
      on musician_role.musician_id =
        musician.id

    cross join params

    where
      musician.active
      and musician_role.approved
      and musician_role.role = p_role
      and (
        params.query = ''
        or musician.normalized_name like
          '%' || params.query || '%'
        or exists (
          select 1
          from public.musician_aliases alias
          where
            alias.musician_id = musician.id
            and alias.active
            and alias.normalized_alias like
              '%' || params.query || '%'
        )
      )
  )

  select
    candidates.id,
    candidates.name,
    candidates.sort_name,
    candidates.apple_music_artist_id,
    candidates.role,
    candidates.role_rank,
    candidates.matched_alias

  from candidates
  cross join params

  order by
    candidates.match_rank,
    candidates.role_rank,
    candidates.sort_name,
    candidates.id

  limit (
    select result_limit
    from params
  );
$function$;
