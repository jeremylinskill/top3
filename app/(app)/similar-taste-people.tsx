import AppText from '@/components/app-text';
import FollowButton from '@/components/follow-button';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import TasteMatchBadge from '@/components/taste-match-badge';
import UserAvatar from '@/components/user-avatar';
import { useBlock } from '@/context/block-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import { getPublicProfilesByIds } from '@/lib/supabase/profiles';
import { getPublishedPosts } from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import {
  getEligibleTasteRecommendations,
  SimilarTastePerson,
} from '@/utils/similar-taste-people';
import { router } from 'expo-router';
import Reanimated from 'react-native-reanimated';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGE_SIZE = 12;

export default function SimilarTastePeopleScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { blockedUserIds } = useBlock();
  const { followedUserIds } = useFollow();
  const ignoreScroll = useCallback((_offsetY: number) => {}, []);
  const ignoreHeaderState = useCallback((_scrolled: boolean) => {}, []);
  const {
    scrollHandler: onScroll,
    headerStyle,
  } = useHomeStickyHeader(ignoreScroll, ignoreHeaderState);

  const [posts, setPosts] = useState<Post[]>([]);
  const [profilesByUserId, setProfilesByUserId] =
    useState<Record<string, UserProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setLoadError(false);
    setVisibleCount(PAGE_SIZE);

    async function loadMatches() {
      try {
        // Same published-list pool and public-profile lookup as Discover.
        const published = await getPublishedPosts();
        const authorIds = [...new Set(published.map((post) => post.authorId))];
        const authors = await getPublicProfilesByIds(authorIds);
        if (!alive) return;
        setPosts(published);
        setProfilesByUserId(
          Object.fromEntries(authors.map((author) => [author.id, author]))
        );
      } catch (error) {
        if (__DEV__) console.log('Failed to load similar taste people:', error);
        if (alive) setLoadError(true);
      } finally {
        if (alive) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }
    void loadMatches();
    return () => { alive = false; };
    // Blocks also affect display immediately via the recommendation filter.
    // Avoid refetching the whole published feed for each block-state change.
  }, [profile.id, reloadKey]);

  const visiblePosts = useMemo(
    () => posts.filter((post) => !blockedUserIds.includes(post.authorId)),
    [posts, blockedUserIds]
  );

  const people = useMemo(() => getEligibleTasteRecommendations({
    posts: visiblePosts,
    profilesByUserId,
    currentUserId: profile.id,
    followedUserIds,
    blockedUserIds,
  }), [visiblePosts, profilesByUserId, profile.id, followedUserIds, blockedUserIds]);

  const visiblePeople = useMemo(
    () => people.slice(0, visibleCount),
    [people, visibleCount]
  );

  const loadMore = useCallback(() => {
    if (isLoading || loadError) return;
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, people.length));
  }, [isLoading, loadError, people.length]);

  const refresh = useCallback(() => {
    if (isLoading || isRefreshing) return;
    setIsRefreshing(true);
    setReloadKey((key) => key + 1);
  }, [isLoading, isRefreshing]);

  const renderPerson = useCallback(({ item }: { item: SimilarTastePerson }) => (
    <View style={[styles.personCard, { backgroundColor: colors.surface }]}>
      <View style={styles.mainContent}>
        <Pressable
          style={({ pressed }) => [styles.profileAction, pressed && styles.pressed]}
          onPress={() => router.push({
            pathname: '/public-profile',
            params: { userId: item.user.id },
          })}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.user.displayName}'s profile`}>
          <UserAvatar
            displayName={item.user.displayName}
            avatarUrl={item.user.avatarUrl}
            size={50}
            fontSize={20}
          />
          <View style={styles.details}>
            <AppText variant="selectionTitle" numberOfLines={1}>
              {item.user.displayName}
            </AppText>
            <AppText variant="subtitle" tone="tertiary"
              style={styles.username} numberOfLines={1}>
              @{item.user.username}
            </AppText>
          </View>
        </Pressable>
        <View style={styles.badgeRow}>
          <TasteMatchBadge
            score={item.score}
            sharedPickCount={item.sharedPickCount}
            onPress={() => router.push({
              pathname: '/taste-match',
              params: { userId: item.user.id },
            })}
          />
        </View>
      </View>
      <FollowButton userId={item.user.id} size="small" style={styles.followButton} />
    </View>
  ), [colors.surface]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['left', 'right']}>
      <Reanimated.View
        pointerEvents="box-none"
        style={[styles.header, { height: insets.top + SCREEN_HEADER_HEIGHT + 16 }, headerStyle]}>
        <ScreenHeader showBackButton overlay featheredBackdrop androidStatusBarGlass />
      </Reanimated.View>
      <Reanimated.FlatList
        data={isLoading || loadError ? [] : visiblePeople}
        keyExtractor={(item) => item.user.id}
        renderItem={renderPerson}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SCREEN_HEADER_HEIGHT + 20,
            paddingBottom: Math.max(40, insets.bottom + 28) },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={isRefreshing}
        onRefresh={refresh}
        ListHeaderComponent={
          <AppText variant="sectionTitle" style={styles.title}>
            People with Similar Taste
          </AppText>
        }
        ListEmptyComponent={
          <View style={styles.state}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.tertiaryText} />
            ) : loadError ? (
              <>
                <AppText variant="body" tone="secondary">
                  Unable to load Taste Matches right now.
                </AppText>
                <Pressable
                  onPress={() => setReloadKey((key) => key + 1)}
                  accessibilityRole="button" style={styles.retry}>
                  <AppText variant="label" emphasis="strong">Try again</AppText>
                </Pressable>
              </>
            ) : (
              <AppText variant="body" tone="secondary" style={styles.emptyMessage}>
                No additional people with similar taste to suggest yet.
              </AppText>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 20 },
  content: { paddingHorizontal: 20 },
  title: { marginBottom: 16 },
  personCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  mainContent: { flex: 1, minWidth: 0 },
  profileAction: { flexDirection: 'row', alignItems: 'center' },
  details: { flex: 1, minWidth: 0, marginLeft: 14 },
  username: { marginTop: 3 },
  badgeRow: { marginLeft: 64 },
  followButton: { marginLeft: 12, minWidth: 86, borderRadius: 10 },
  pressed: { opacity: 0.65 },
  state: { alignItems: 'center', paddingVertical: 34, gap: 12 },
  emptyMessage: { textAlign: 'center' },
  retry: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20 },
});
