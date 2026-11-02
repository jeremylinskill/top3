import AppText from '@/components/app-text';
import SearchInput from '@/components/search-input';
import FollowButton from '@/components/follow-button';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import UserAvatar from '@/components/user-avatar';
import { useBlock } from '@/context/block-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import {
  getNewestPublicProfilesPage,
  getPublicProfilesByIds,
  searchPublicProfiles,
} from '@/lib/supabase/profiles';
import { getPublishedPosts } from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { buildDiscoverPeople, DiscoverPerson } from '@/utils/discover-people';
import { router, useLocalSearchParams } from 'expo-router';
import Reanimated from 'react-native-reanimated';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGE_SIZE = 20;

export default function DiscoverPeopleScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  // Match the existing floating header behaviour on Taste Match and profiles.
  const ignorePeopleScroll = useCallback((_offsetY: number) => {}, []);
  const ignorePeopleHeaderState = useCallback((_scrolled: boolean) => {}, []);
  const {
    scrollHandler: onPeopleScroll,
    headerStyle: peopleHeaderStyle,
  } = useHomeStickyHeader(ignorePeopleScroll, ignorePeopleHeaderState);
  const { profile } = useProfile();
  const { followedUserIds } = useFollow();
  const { blockedUserIds } = useBlock();
  const { exclude } = useLocalSearchParams<{ exclude?: string | string[] }>();
  const excludedUserIds = useMemo(() =>
    (Array.isArray(exclude) ? exclude[0] : exclude ?? '')
      .split(',')
      .filter(Boolean),
    [exclude]
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [profilesByUserId, setProfilesByUserId] =
    useState<Record<string, UserProfile>>({});
  const [newestProfiles, setNewestProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const nextOffset = useRef(0);
  const loadingMore = useRef(false);
  const generation = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedSearchQuery = searchQuery.trim();
  const isSearchActive = normalizedSearchQuery.length > 0;
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchRetryKey, setSearchRetryKey] = useState(0);

  // Reuse Discover's server-side profile search, not just the profiles
  // that have already loaded in this suggestions list.
  useEffect(() => {
    let active = true;
    if (!normalizedSearchQuery) {
      setSearchResults([]);
      setIsSearchLoading(false);
      setSearchError(false);
      return () => { active = false; };
    }

    setSearchResults([]);
    setIsSearchLoading(true);
    setSearchError(false);
    const timer = setTimeout(() => {
      async function searchPeople() {
        try {
          const matches = await searchPublicProfiles(
            normalizedSearchQuery, profile.id
          );
          if (active) setSearchResults(matches);
        } catch (error) {
          if (__DEV__) console.log('Unable to search people:', error);
          if (active) {
            setSearchResults([]);
            setSearchError(true);
          }
        } finally {
          if (active) setIsSearchLoading(false);
        }
      }
      void searchPeople();
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [normalizedSearchQuery, profile.id, searchRetryKey]);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    let alive = true;
    loadingMore.current = false;
    nextOffset.current = 0;
    setIsLoading(true);
    setLoadError(false);
    setMoreError(false);
    setHasMore(false);

    async function loadInitial() {
      try {
        const [latest, published] = await Promise.all([
          getNewestPublicProfilesPage(profile.id, 0, PAGE_SIZE),
          getPublishedPosts(),
        ]);
        const authorIds = [...new Set(published.map((post) => post.authorId))];
        const authors = await getPublicProfilesByIds(authorIds);
        if (!alive || currentGeneration !== generation.current) return;
        setPosts(published);
        setProfilesByUserId(
          Object.fromEntries(authors.map((author) => [author.id, author]))
        );
        setNewestProfiles(latest);
        nextOffset.current = latest.length;
        setHasMore(latest.length === PAGE_SIZE);
      } catch (error) {
        if (__DEV__) console.log('Unable to load Discover People:', error);
        if (alive && currentGeneration === generation.current) setLoadError(true);
      } finally {
        if (alive && currentGeneration === generation.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }
    void loadInitial();
    return () => { alive = false; generation.current += 1; };
  }, [profile.id, reloadKey]);

  const people = useMemo(() => buildDiscoverPeople({
    posts,
    profilesByUserId,
    newestProfiles,
    currentUserId: profile.id,
    followedUserIds,
    blockedUserIds,
    excludedUserIds,
  }), [
    posts, profilesByUserId, newestProfiles, profile.id,
    followedUserIds, blockedUserIds, excludedUserIds,
  ]);

  // Unlike recommendations, deliberate search includes already-followed
  // people. FollowButton reflects the actual relationship automatically.
  const searchedPeople = useMemo<DiscoverPerson[]>(() =>
    searchResults
      .filter((user) => user.id !== profile.id && !blockedUserIds.includes(user.id))
      .map((user) => ({ user, detail: 'Top 3 member' })),
    [searchResults, profile.id, blockedUserIds]
  );

  const loadMore = useCallback(async () => {
    if (isSearchActive || isLoading || !hasMore || loadingMore.current || moreError) return;
    const currentGeneration = generation.current;
    loadingMore.current = true;
    setIsLoadingMore(true);
    try {
      const page = await getNewestPublicProfilesPage(
        profile.id, nextOffset.current, PAGE_SIZE
      );
      if (generation.current !== currentGeneration) return;
      nextOffset.current += page.length;
      setNewestProfiles((existing) => {
        const known = new Set(existing.map((user) => user.id));
        return [...existing, ...page.filter((user) => !known.has(user.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } catch (error) {
      if (__DEV__) console.log('Unable to load more people:', error);
      if (generation.current === currentGeneration) setMoreError(true);
    } finally {
      if (generation.current === currentGeneration) {
        loadingMore.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [profile.id, hasMore, isLoading, moreError, isSearchActive]);

  // A full page of existing follows may contain no eligible suggestions.
  // Continue through later pages so the screen does not appear empty.
  useEffect(() => {
    if (!isSearchActive && !isLoading && !isLoadingMore && !moreError && hasMore && people.length < 4) {
      void loadMore();
    }
  }, [isSearchActive, isLoading, isLoadingMore, moreError, hasMore, people.length, loadMore]);

  function refresh() {
    if (isSearchActive) {
      setSearchRetryKey((key) => key + 1);
      return;
    }
    if (isLoading || isRefreshing) return;
    setIsRefreshing(true);
    setReloadKey((key) => key + 1);
  }

  const renderPerson = useCallback(({ item }: { item: DiscoverPerson }) => (
    <View style={[styles.personCard, { backgroundColor: colors.surface }]}>
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
          <AppText variant="metadata" tone="secondary"
            style={styles.detail} numberOfLines={1}>
            {item.detail}
          </AppText>
        </View>
      </Pressable>
      <FollowButton userId={item.user.id} size="small" style={styles.followButton} />
    </View>
  ), [colors.surface]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}
      edges={['left', 'right']}>
      <Reanimated.View
        pointerEvents="box-none"
        style={[
          styles.header,
          { height: insets.top + SCREEN_HEADER_HEIGHT + 16 },
          peopleHeaderStyle,
        ]}>
        <ScreenHeader showBackButton overlay featheredBackdrop androidStatusBarGlass />
      </Reanimated.View>
      <Reanimated.FlatList
        data={isSearchActive
          ? (isSearchLoading || searchError ? [] : searchedPeople)
          : (isLoading || loadError ? [] : people)}
        keyExtractor={(item) => item.user.id}
        renderItem={renderPerson}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SCREEN_HEADER_HEIGHT + 20,
            paddingBottom: Math.max(40, insets.bottom + 28) },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onPeopleScroll}
        scrollEventThrottle={16}
        onEndReached={() => { if (!isSearchActive) void loadMore(); }}
        onEndReachedThreshold={0.5}
        refreshing={isSearchActive ? false : isRefreshing}
        onRefresh={refresh}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        ListHeaderComponent={
          <View style={styles.heading}>
            <View style={styles.searchField}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search people by name or username"
                accessibilityLabel="Search people by name or username"
                onSubmitEditing={() => Keyboard.dismiss()}
                onClear={() => setSearchQuery('')}
              />
            </View>
            <AppText variant="sectionTitle" style={styles.listLabel}>
              {isSearchActive ? 'Search results' : 'Suggested for you'}
            </AppText>
          </View>
        }
        ListEmptyComponent={
          isSearchActive ? (
            isSearchLoading ? (
              <View style={styles.state}>
                <ActivityIndicator size="small" color={colors.tertiaryText} />
              </View>
            ) : searchError ? (
              <View style={styles.state}>
                <AppText variant="body" tone="secondary">Unable to search people right now.</AppText>
                <Pressable
                  onPress={() => setSearchRetryKey((key) => key + 1)}
                  accessibilityRole="button" style={styles.retry}>
                  <AppText variant="label" emphasis="strong">Try again</AppText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.state}>
                <AppText variant="body" tone="secondary">No matching people found.</AppText>
              </View>
            )
          ) : isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator size="small" color={colors.tertiaryText} />
            </View>
          ) : loadError ? (
            <View style={styles.state}>
              <AppText variant="body" tone="secondary">Unable to load people right now.</AppText>
              <Pressable onPress={() => setReloadKey((key) => key + 1)}
                accessibilityRole="button" style={styles.retry}>
                <AppText variant="label" emphasis="strong">Try again</AppText>
              </Pressable>
            </View>
          ) : !hasMore ? (
            <View style={styles.state}>
              <AppText variant="body" tone="secondary">
                No more people to suggest yet.
              </AppText>
            </View>
          ) : null
        }
        ListFooterComponent={
          isSearchActive ? null : isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.tertiaryText} />
            </View>
          ) : moreError ? (
            <Pressable style={styles.retry}
              accessibilityRole="button"
              onPress={() => setMoreError(false)}>
              <AppText variant="label" emphasis="strong">Retry loading more people</AppText>
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 20 },
  content: { paddingHorizontal: 20 },
  heading: { marginBottom: 20 },
  searchField: { marginTop: 0 },
  listLabel: { marginTop: 20 },
  personCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  profileAction: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  details: { flex: 1, minWidth: 0, marginLeft: 14 },
  username: { marginTop: 3 },
  detail: { marginTop: 5 },
  followButton: { marginLeft: 12, minWidth: 86, borderRadius: 10 },
  pressed: { opacity: 0.65 },
  state: { alignItems: 'center', paddingVertical: 34, gap: 12 },
  footer: { paddingVertical: 20, alignItems: 'center' },
  retry: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20 },
});
