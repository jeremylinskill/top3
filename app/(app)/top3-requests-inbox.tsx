// Internal request-ID destination. The former management inbox UI has been removed.
// Notification cards remain the only visible request management surface.
import { useCollectionOptions } from '@/context/collection-options-context';
import { useTop3 } from '@/context/top3-context';
import { useAuth } from '@/hooks/use-auth';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  getTop3RequestForRecipient, requestDestination,
  type Top3Request,
} from '@/lib/supabase/top3-requests';
import { resolveNotificationCollection } from '@/utils/resolve-notification-collection';
import { getProfileById } from '@/lib/supabase/profiles';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Top3RequestDestination() {
  const { requestId } = useLocalSearchParams<{ requestId?: string | string[] }>();
  const targetRequestId = Array.isArray(requestId) ? requestId[0] : requestId;
  const openedRequestRef = useRef<string | null>(null);
  const colors = useAppColors();
  const { user } = useAuth();
  const { options } = useCollectionOptions();
  const { lists, startListWithoutSaving, selectList,
    isCollectionsLoaded, hasCollectionsLoadError } = useTop3();
  const [requests, setRequests] = useState<Top3Request[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id || !targetRequestId) return;
    setLoading(true);
    try {
      const request = await getTop3RequestForRecipient(user.id, targetRequestId);
      setRequests(request ? [request] : []);
    } catch (err) {
      Alert.alert('Unable to load request', err instanceof Error ? err.message : 'Please try again.');
      router.replace('/notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id, targetRequestId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    if (!targetRequestId) router.replace('/notifications');
  }, [targetRequestId]);

  function match(r: Top3Request) {
    const input = resolveNotificationCollection(requestDestination(r), options, { includePodcasts: true });
    if (!input) return { input: null, existing: undefined };
    const norm = (s?: string) => (s ?? '').trim().toLowerCase();
    const existing = lists.filter(l =>
      norm(l.category) === norm(input.category) &&
      (input.collectionOptionId
        ? norm(l.collectionOptionId) === norm(input.collectionOptionId)
        : norm(l.type) === norm(input.type) && norm(l.topic) === norm(input.topic))
    ).sort((a,b) => Number(Boolean(b.publishedAt)) - Number(Boolean(a.publishedAt)))[0];
    return { input, existing };
  }

  async function respond(r: Top3Request) {
    if (!isCollectionsLoaded) return;
    const { input, existing } = match(r);
    if (!input) {
      Alert.alert('Topic unavailable', 'This topic is no longer available.');
      router.replace('/notifications');
      return;
    }
    try {
      // Opening a request must NEVER fulfill it. Even a published ranking
      // must be shown to its owner for an explicit Share action first.
      const listId = existing
        ? (selectList(existing.id), existing.id)
        : startListWithoutSaving(input);
      let requesterName = 'The requester';
      try {
        const requester = await getProfileById(r.requester_user_id);
        requesterName = requester?.displayName?.trim() ||
          requester?.username?.trim() || requesterName;
      } catch {
        // The request itself remains actionable if profile enrichment fails.
      }
      router.replace({
        pathname: '/collection',
        params: { listId, top3RequestId: r.id, top3RequesterName: requesterName },
      });
    } catch (err) {
      Alert.alert('Unable to open Top 3', err instanceof Error ? err.message : 'Try again.');
      router.replace('/notifications');
    }
  }

  useEffect(() => {
    if (!targetRequestId || openedRequestRef.current === targetRequestId ||
        loading) return;
    if (hasCollectionsLoadError) {
      openedRequestRef.current = targetRequestId;
      Alert.alert('Unable to open Top 3', 'Your lists could not be loaded.');
      router.replace('/notifications');
      return;
    }
    if (!isCollectionsLoaded) return;
    const target = requests.find(r => r.id === targetRequestId);
    if (!target) {
      openedRequestRef.current = targetRequestId;
      Alert.alert('Request unavailable', 'This Top 3 request could not be found.');
      router.replace('/notifications');
      return;
    }
    if (target.status === 'fulfilled') {
      openedRequestRef.current = targetRequestId;
      if (target.fulfilled_collection_id) {
        router.replace({
          pathname: '/published-top3',
          params: { postId: `post-${target.fulfilled_collection_id}` },
        });
      } else {
        router.replace('/notifications');
      }
      return;
    }
    if (target.status === 'dismissed') {
      openedRequestRef.current = targetRequestId;
      router.replace('/notifications');
      return;
    }
    if (!match(target).input &&
        (target.destination_kind === 'type' || target.destination_kind === 'theme') &&
        options.length === 0) return;
    openedRequestRef.current = targetRequestId;
    void respond(target);
  }, [targetRequestId, loading, isCollectionsLoaded, hasCollectionsLoadError, requests, options, lists]);

  return <SafeAreaView edges={['left','right']}
    style={{flex:1, backgroundColor:colors.background, justifyContent:'center'}}>
    <ActivityIndicator color={colors.text}/>
  </SafeAreaView>;
}
