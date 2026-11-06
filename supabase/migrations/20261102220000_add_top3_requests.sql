-- Top 3 requests V1. DEVELOPMENT FIRST; do not apply to Production without a separate review.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '45s';
DO $preflight$
BEGIN
  IF to_regclass('public.top3_requests') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: top3_requests already exists';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
      WHERE conrelid = 'public.notifications'::regclass
        AND conname = 'notifications_type_check' AND convalidated) <> 1 THEN
    RAISE EXCEPTION 'STOP: expected notifications_type_check unavailable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='collections'
       AND column_name='collection_option_id') THEN
    RAISE EXCEPTION 'STOP: collections.collection_option_id unavailable';
  END IF;
END;
$preflight$;

-- Controlled genre catalog, generated from the bundled category/topic definitions.
-- Clients cannot submit arbitrary topic labels.
CREATE TABLE public.top3_request_genres (
  category_id text NOT NULL, genre_id text NOT NULL, label text NOT NULL,
  PRIMARY KEY (category_id,genre_id)
);
ALTER TABLE public.top3_request_genres ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.top3_request_genres FROM PUBLIC,anon,authenticated;
INSERT INTO public.top3_request_genres (category_id,genre_id,label) VALUES
  ('albums', 'alternative', 'Alternative'),
  ('albums', 'blues', 'Blues'),
  ('albums', 'classical', 'Classical'),
  ('albums', 'country', 'Country'),
  ('albums', 'dance', 'Dance'),
  ('albums', 'electronic', 'Electronic'),
  ('albums', 'folk', 'Folk'),
  ('albums', 'hip-hop', 'Hip-Hop'),
  ('albums', 'jazz', 'Jazz'),
  ('albums', 'latin', 'Latin'),
  ('albums', 'metal', 'Metal'),
  ('albums', 'pop', 'Pop'),
  ('albums', 'r-and-b', 'R&B'),
  ('albums', 'reggae', 'Reggae'),
  ('albums', 'rock', 'Rock'),
  ('artists', 'alternative', 'Alternative'),
  ('artists', 'blues', 'Blues'),
  ('artists', 'classical', 'Classical'),
  ('artists', 'country', 'Country'),
  ('artists', 'dance', 'Dance'),
  ('artists', 'electronic', 'Electronic'),
  ('artists', 'folk', 'Folk'),
  ('artists', 'hip-hop', 'Hip-Hop'),
  ('artists', 'jazz', 'Jazz'),
  ('artists', 'latin', 'Latin'),
  ('artists', 'metal', 'Metal'),
  ('artists', 'pop', 'Pop'),
  ('artists', 'r-and-b', 'R&B'),
  ('artists', 'reggae', 'Reggae'),
  ('artists', 'rock', 'Rock'),
  ('books', 'biography', 'Biography'),
  ('books', 'business', 'Business'),
  ('books', 'childrens', 'Children''s'),
  ('books', 'fantasy', 'Fantasy'),
  ('books', 'fiction', 'Fiction'),
  ('books', 'graphic-novel', 'Graphic Novel'),
  ('books', 'history', 'History'),
  ('books', 'mystery', 'Mystery'),
  ('books', 'non-fiction', 'Non-Fiction'),
  ('books', 'romance', 'Romance'),
  ('books', 'sci-fi', 'Sci-Fi'),
  ('books', 'self-help', 'Self-Help'),
  ('movies', 'action', 'Action'),
  ('movies', 'adventure', 'Adventure'),
  ('movies', 'comedy', 'Comedy'),
  ('movies', 'documentary', 'Documentary'),
  ('movies', 'drama', 'Drama'),
  ('movies', 'fantasy', 'Fantasy'),
  ('movies', 'horror', 'Horror'),
  ('movies', 'romance', 'Romance'),
  ('movies', 'sci-fi', 'Sci-Fi'),
  ('movies', 'thriller', 'Thriller'),
  ('songs', 'alternative', 'Alternative'),
  ('songs', 'blues', 'Blues'),
  ('songs', 'classical', 'Classical'),
  ('songs', 'country', 'Country'),
  ('songs', 'dance', 'Dance'),
  ('songs', 'electronic', 'Electronic'),
  ('songs', 'folk', 'Folk'),
  ('songs', 'hip-hop', 'Hip-Hop'),
  ('songs', 'jazz', 'Jazz'),
  ('songs', 'latin', 'Latin'),
  ('songs', 'metal', 'Metal'),
  ('songs', 'pop', 'Pop'),
  ('songs', 'r-and-b', 'R&B'),
  ('songs', 'reggae', 'Reggae'),
  ('songs', 'rock', 'Rock'),
  ('tv', 'comedy', 'Comedy'),
  ('tv', 'crime', 'Crime'),
  ('tv', 'documentary', 'Documentary'),
  ('tv', 'drama', 'Drama'),
  ('tv', 'fantasy', 'Fantasy'),
  ('tv', 'reality', 'Reality'),
  ('tv', 'sci-fi', 'Sci-Fi'),
  ('tv', 'animated', 'Animated'),
  ('games', 'action', 'Action'),
  ('games', 'adventure', 'Adventure'),
  ('games', 'rpg', 'RPG'),
  ('games', 'shooter', 'Shooter'),
  ('games', 'strategy', 'Strategy'),
  ('games', 'simulation', 'Simulation'),
  ('games', 'racing', 'Racing'),
  ('games', 'sports', 'Sports'),
  ('games', 'puzzle', 'Puzzle');

CREATE TABLE public.top3_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id text NOT NULL CHECK (category_id IN ('movies','tv','books','games','albums','artists','songs')),
  destination_kind text NOT NULL CHECK (destination_kind IN ('overall','type','theme','genre')),
  option_id text,
  topic_label text NOT NULL CHECK (char_length(btrim(topic_label)) BETWEEN 2 AND 90),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','dismissed')),
  fulfilled_collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_user_id <> recipient_user_id),
  CHECK ((destination_kind='overall' AND option_id IS NULL) OR
         (destination_kind<>'overall' AND option_id IS NOT NULL AND length(option_id) BETWEEN 1 AND 100))
);
CREATE UNIQUE INDEX top3_requests_one_pending_topic
  ON public.top3_requests(requester_user_id,recipient_user_id,category_id,destination_kind,coalesce(option_id,''))
  WHERE status='pending';
CREATE INDEX top3_requests_recipient_pending ON public.top3_requests(recipient_user_id,created_at DESC)
  WHERE status='pending';
CREATE INDEX top3_requests_requester_created ON public.top3_requests(requester_user_id,created_at DESC);
ALTER TABLE public.top3_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY top3_requests_participants_read ON public.top3_requests FOR SELECT TO authenticated
  USING (auth.uid() IN (requester_user_id,recipient_user_id));
-- No direct INSERT / UPDATE / DELETE grants: verified RPCs own all lifecycle changes.
REVOKE ALL ON public.top3_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.top3_requests TO authenticated;

ALTER TABLE public.notifications ADD COLUMN top3_request_id uuid REFERENCES public.top3_requests(id) ON DELETE CASCADE;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like','comment','comment_reply','comment_like','follow','follow_request_accepted',
                 'announcement','top3_request','top3_request_fulfilled'));
ALTER TABLE public.notifications ADD CONSTRAINT notifications_top3_request_shape_check CHECK (
  ((type IN ('top3_request','top3_request_fulfilled')) AND top3_request_id IS NOT NULL) OR
  ((type NOT IN ('top3_request','top3_request_fulfilled')) AND top3_request_id IS NULL)
);
CREATE UNIQUE INDEX notifications_one_event_per_top3_request
  ON public.notifications(top3_request_id,type)
  WHERE top3_request_id IS NOT NULL;

-- A request is fulfilled only by a published, still-visible list belonging to its recipient.
CREATE FUNCTION public.top3_request_collection_matches(r public.top3_requests,c public.collections)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public,pg_temp
AS $$
 SELECT c.user_id = r.recipient_user_id AND c.category = r.category_id
   AND c.status='published' AND c.published_at IS NOT NULL AND c.removed_at IS NULL
   AND CASE
     WHEN r.destination_kind='overall' THEN
       c.collection_option_id IS NULL AND
       (c.topic IS NULL OR lower(btrim(c.topic))='general') AND
       (c.type IS NULL OR lower(btrim(c.type))='general')
     WHEN r.destination_kind IN ('type','theme') THEN c.collection_option_id = r.option_id
     ELSE c.collection_option_id IS NULL AND lower(btrim(coalesce(c.topic,'')))=lower(btrim(r.topic_label))
   END;
$$;
REVOKE ALL ON FUNCTION public.top3_request_collection_matches(public.top3_requests,public.collections) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.complete_top3_request(p_request_id uuid,p_collection_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.top3_requests%ROWTYPE; c public.collections%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO r FROM public.top3_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR r.recipient_user_id<>auth.uid() OR r.status<>'pending' THEN RETURN false; END IF;
  SELECT * INTO c FROM public.collections WHERE id=p_collection_id;
  IF NOT FOUND OR NOT public.top3_request_collection_matches(r,c) THEN
    RAISE EXCEPTION 'The published Top 3 does not match this request';
  END IF;
  UPDATE public.top3_requests SET status='fulfilled', fulfilled_collection_id=c.id, updated_at=now()
    WHERE id=r.id AND status='pending';
  INSERT INTO public.notifications(recipient_user_id,actor_user_id,type,collection_id,top3_request_id)
    VALUES (r.requester_user_id,r.recipient_user_id,'top3_request_fulfilled',c.id,r.id);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_top3_request(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_top3_request(uuid,uuid) TO authenticated;

CREATE FUNCTION public.send_top3_request(p_recipient_user_id uuid,p_category_id text,p_kind text,p_option_id text DEFAULT NULL,p_topic_label text DEFAULT NULL)
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
  IF p_category_id NOT IN ('movies','tv','books','games','albums','artists','songs') OR
     p_kind NOT IN ('overall','type','theme','genre') THEN RAISE EXCEPTION 'Invalid category or topic'; END IF;
  IF p_kind='overall' THEN
    IF cleaned_option IS NOT NULL THEN RAISE EXCEPTION 'Unexpected topic ID'; END IF;
    label := CASE p_category_id WHEN 'tv' THEN 'TV Shows' WHEN 'games' THEN 'Video Games'
             WHEN 'albums' THEN 'Albums' WHEN 'artists' THEN 'Artists' WHEN 'songs' THEN 'Songs'
             WHEN 'books' THEN 'Books' ELSE 'Movies' END;
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
REVOKE ALL ON FUNCTION public.send_top3_request(uuid,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_top3_request(uuid,text,text,text,text) TO authenticated;

CREATE FUNCTION public.dismiss_top3_request(p_request_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 UPDATE public.top3_requests SET status='dismissed',updated_at=now()
 WHERE id=p_request_id AND recipient_user_id=auth.uid() AND status='pending';
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.dismiss_top3_request(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dismiss_top3_request(uuid) TO authenticated;

CREATE FUNCTION public.fulfill_top3_requests_on_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.top3_requests%ROWTYPE;
BEGIN
 IF NEW.status<>'published' OR NEW.published_at IS NULL OR NEW.removed_at IS NOT NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.status='published' AND OLD.published_at IS NOT DISTINCT FROM NEW.published_at THEN RETURN NEW; END IF;
 END IF;
 FOR r IN SELECT * FROM public.top3_requests WHERE recipient_user_id=NEW.user_id AND category_id=NEW.category
   AND status='pending' FOR UPDATE LOOP
   IF public.top3_request_collection_matches(r,NEW) THEN
     UPDATE public.top3_requests SET status='fulfilled',fulfilled_collection_id=NEW.id,updated_at=now()
       WHERE id=r.id AND status='pending';
     INSERT INTO public.notifications(recipient_user_id,actor_user_id,type,collection_id,top3_request_id)
       VALUES (r.requester_user_id,NEW.user_id,'top3_request_fulfilled',NEW.id,r.id);
   END IF;
 END LOOP;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_top3_requests_on_publish() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER fulfill_top3_requests_when_published
 AFTER INSERT OR UPDATE OF status,published_at ON public.collections
 FOR EACH ROW EXECUTE FUNCTION public.fulfill_top3_requests_on_publish();
COMMIT;
