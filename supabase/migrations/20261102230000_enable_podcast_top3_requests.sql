-- Forward-only parity fix: Create and Request a Top 3 must offer the same categories.
-- Development first. Do NOT modify the previously applied migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '45s';
DO $preflight$
DECLARE
  cdef text;
  fbody text;
BEGIN
  IF to_regclass('public.top3_requests') IS NULL
     OR to_regclass('public.top3_request_genres') IS NULL THEN
    RAISE EXCEPTION 'STOP: Request a Top 3 foundation is missing';
  END IF;
  SELECT pg_get_constraintdef(oid) INTO cdef
    FROM pg_constraint WHERE conrelid='public.top3_requests'::regclass
    AND conname='top3_requests_category_id_check';
  IF cdef IS NULL OR position('podcasts' in cdef)>0 THEN
    RAISE EXCEPTION 'STOP: Existing request category constraint is unexpected';
  END IF;
  SELECT prosrc INTO fbody FROM pg_proc
    WHERE oid=to_regprocedure('public.send_top3_request(uuid,text,text,text,text)');
  IF fbody IS NULL OR position('p_category_id NOT IN' in fbody)=0
     OR position('podcasts' in fbody)>0 THEN
    RAISE EXCEPTION 'STOP: Existing send_top3_request function differs from reviewed version';
  END IF;
  IF EXISTS(SELECT 1 FROM public.top3_request_genres WHERE category_id='podcasts') THEN
    RAISE EXCEPTION 'STOP: Podcast request genres already exist';
  END IF;
END;
$preflight$;

ALTER TABLE public.top3_requests
  DROP CONSTRAINT top3_requests_category_id_check;
ALTER TABLE public.top3_requests
  ADD CONSTRAINT top3_requests_category_id_check
  CHECK (category_id IN ('movies','tv','books','games','albums','artists','songs','podcasts'));

-- Keep request genres equal to the 12 Podcasts topics exposed by Create a Top 3.
INSERT INTO public.top3_request_genres(category_id,genre_id,label) VALUES
  ('podcasts', 'arts', 'Arts'),
  ('podcasts', 'business', 'Business'),
  ('podcasts', 'comedy', 'Comedy'),
  ('podcasts', 'education', 'Education'),
  ('podcasts', 'health-and-fitness', 'Health & Fitness'),
  ('podcasts', 'history', 'History'),
  ('podcasts', 'music', 'Music'),
  ('podcasts', 'news', 'News'),
  ('podcasts', 'science', 'Science'),
  ('podcasts', 'society-and-culture', 'Society & Culture'),
  ('podcasts', 'sports', 'Sports'),
  ('podcasts', 'true-crime', 'True Crime');

CREATE OR REPLACE FUNCTION public.send_top3_request(p_recipient_user_id uuid,p_category_id text,p_kind text,p_option_id text DEFAULT NULL,p_topic_label text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE sender uuid := auth.uid(); cleaned_option text:=nullif(btrim(coalesce(p_option_id,'')),'');
  label text; result_id uuid; option_record record;
BEGIN
  IF sender IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_recipient_user_id IS NULL OR p_recipient_user_id=sender THEN RAISE EXCEPTION 'Invalid recipient'; END IF;
  -- Serialize rate-limit checks per sender, including concurrent requests.
  PERFORM pg_advisory_xact_lock(hashtextextended('top3-request:' || sender::text,0));
  IF NOT EXISTS(SELECT 1 FROM public.follows WHERE follower_id=sender AND following_id=p_recipient_user_id) THEN
    RAISE EXCEPTION 'You must follow this person to request a Top 3';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocks WHERE
    (blocker_id=sender AND blocked_user_id=p_recipient_user_id) OR
    (blocker_id=p_recipient_user_id AND blocked_user_id=sender)) THEN
    RAISE EXCEPTION 'Requests are not available between these accounts';
  END IF;
  IF (SELECT count(*) FROM public.top3_requests WHERE requester_user_id=sender
       AND created_at>now()-interval '24 hours')>=5 THEN
    RAISE EXCEPTION 'Daily limit reached. Try again tomorrow';
  END IF;
  IF p_category_id NOT IN ('movies','tv','books','games','albums','artists','songs','podcasts') OR
     p_kind NOT IN ('overall','type','theme','genre') THEN RAISE EXCEPTION 'Invalid category or topic'; END IF;
  IF p_kind='overall' THEN
    IF cleaned_option IS NOT NULL THEN RAISE EXCEPTION 'Unexpected topic ID'; END IF;
    label := CASE p_category_id WHEN 'tv' THEN 'TV Shows' WHEN 'games' THEN 'Video Games'
             WHEN 'albums' THEN 'Albums' WHEN 'artists' THEN 'Artists' WHEN 'songs' THEN 'Songs'
             WHEN 'books' THEN 'Books' WHEN 'podcasts' THEN 'Podcasts' ELSE 'Movies' END;
  ELSIF p_kind IN ('type','theme') THEN
    SELECT id,name INTO option_record FROM public.collection_options
     WHERE id=cleaned_option AND category_id=p_category_id AND kind=p_kind AND active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or inactive Top 3 topic'; END IF;
    label := option_record.name;
  ELSE
    SELECT g.label INTO label FROM public.top3_request_genres g
      WHERE g.category_id=p_category_id AND g.genre_id=cleaned_option;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid Top 3 genre'; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.top3_requests WHERE requester_user_id=sender
    AND recipient_user_id=p_recipient_user_id AND category_id=p_category_id
    AND destination_kind=p_kind AND coalesce(option_id,'')=coalesce(cleaned_option,'')
    AND status='pending') THEN RAISE EXCEPTION 'You already have a pending request for this topic'; END IF;
  INSERT INTO public.top3_requests(requester_user_id,recipient_user_id,category_id,destination_kind,option_id,topic_label)
    VALUES(sender,p_recipient_user_id,p_category_id,p_kind,cleaned_option,label) RETURNING id INTO result_id;
  INSERT INTO public.notifications(recipient_user_id,actor_user_id,type,top3_request_id)
    VALUES(p_recipient_user_id,sender,'top3_request',result_id);
  RETURN result_id;
END;
$$;

DO $postflight$
BEGIN
  IF (SELECT count(*) FROM public.top3_request_genres WHERE category_id='podcasts') <> 12 THEN
    RAISE EXCEPTION 'STOP: Unexpected Podcast topic count after migration';
  END IF;
END;
$postflight$;
COMMIT;
