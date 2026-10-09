-- Extended musician search with optional editorial overrides.
-- Preserve the existing RPC for backwards compatibility.

create function public.search_musicians_by_role_with_overrides(
  p_role text,
  p_query text default '',
  p_limit integer default 20
)
returns table (
  id text,
  name text,
  sort_name text,
  apple_music_artist_id text,
  image_url_override text,
  preview_artist_id_override text,
  byline_override text,
  role text,
  role_rank integer,
  matched_alias text
)
language sql
stable
set search_path to ''
as $function$
  select
    result.id,
    result.name,
    result.sort_name,
    result.apple_music_artist_id,
    musician.image_url_override,
    musician.preview_artist_id_override,
    musician.byline_override,
    result.role,
    result.role_rank,
    result.matched_alias
  from public.search_musicians_by_role(
    p_role,
    p_query,
    p_limit
  ) with ordinality as result
  inner join public.musicians musician
    on musician.id = result.id
  order by result.ordinality;
$function$;

revoke all
  on function public.search_musicians_by_role_with_overrides(
    text, text, integer
  )
  from public;

grant execute
  on function public.search_musicians_by_role_with_overrides(
    text, text, integer
  )
  to anon, authenticated;

grant execute
  on function public.search_musicians_by_role_with_overrides(
    text, text, integer
  )
  to postgres, service_role;
