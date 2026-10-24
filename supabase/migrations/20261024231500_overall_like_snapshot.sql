-- Overall ranking Like totals, counted in PostgreSQL rather than in the app.
-- Safe to install in Top3 - Dev before installing the updated app code.
-- No data is modified. Uses caller permissions/RLS; only signed-in users may call.
BEGIN;

CREATE FUNCTION public.get_community_ranking_like_snapshot()
RETURNS TABLE (
  ranking_key text,
  like_count bigint,
  liked_by_me boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT
    l.ranking_key,
    count(*)::bigint AS like_count,
    coalesce(bool_or(l.user_id = (SELECT auth.uid())), false) AS liked_by_me
  FROM public.community_ranking_likes AS l
  GROUP BY l.ranking_key;
$function$;

REVOKE ALL ON FUNCTION public.get_community_ranking_like_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_community_ranking_like_snapshot()
  TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
