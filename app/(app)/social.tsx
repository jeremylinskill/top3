import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import SegmentedControl from '@/components/segmented-control';
import TasteMatchBadge from '@/components/taste-match-badge';
import UserAvatar from '@/components/user-avatar';
import { useBlock } from '@/context/block-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { getFollowSnapshot } from '@/lib/supabase/follows';
import {
  getProfileById,
  getProfilesByIds,
} from '@/lib/supabase/profiles';
import { getPublishedPosts } from '@/services/post-service';
import { getTasteRecommendationForUser } from '@/services/taste-recommendation-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SocialTab = 'followers' | 'following';

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function buildProfileRecord(
  profiles: UserProfile[]
): Record<string, UserProfile> {
  return profiles.reduce<Record<string, UserProfile>>(
    (record, user) => {
      record[user.id] = user;
      return record;
    },
    {}
  );
}

export default function SocialScreen() {
  const colors = useAppColors();
  const params = useLocalSearchParams<{
    tab?: string | string[];
    userId?: string | string[];
  }>();

  const { profile } = useProfile();
  useTop3();

  const initialTabParam = Array.isArray(
    params.tab
  )
    ? params.tab[0]
    : params.tab;

  const initialTab: SocialTab =
    initialTabParam === 'followers'
      ? 'followers'
      : 'following';

  const requestedUserIdParam = Array.isArray(
    params.userId
  )
    ? params.userId[0]
    : params.userId;

  const socialOwnerId =
    requestedUserIdParam?.trim() || profile.id;

  const isOwnSocialProfile =
    !socialOwnerId || socialOwnerId === profile.id;

  const { blockedUserIds } = useBlock();

  const {
    followedUserIds,
    followerUserIds,
    isFollowing,
    isFollowRequested,
    toggleFollow,
    unfollowUser,
    requestFollow,
    cancelFollowRequest,
    removeFollower,
    isLoading,
    hasLoadError,
    retryFollowState,
  } = useFollow();

  const [activeTab, setActiveTab] =
    useState<SocialTab>(initialTab);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [
    followerToRemove,
    setFollowerToRemove,
  ] = useState<UserProfile | null>(null);

  const [allPosts, setAllPosts] = useState<Post[]>([]);

  const [isLoadingPosts, setIsLoadingPosts] =
    useState(true);

  const [
    socialProfilesById,
    setSocialProfilesById,
  ] = useState<Record<string, UserProfile>>({});

  const socialProfilesByIdRef = useRef<
    Record<string, UserProfile>
  >({});

  const [
    isLoadingProfiles,
    setIsLoadingProfiles,
  ] = useState(true);

  const [
    hasProfileLoadError,
    setHasProfileLoadError,
  ] = useState(false);

  const [
    profileLoadAttempt,
    setProfileLoadAttempt,
  ] = useState(0);

  const [
    socialOwnerProfile,
    setSocialOwnerProfile,
  ] = useState<UserProfile | null>(null);

  const [
    isLoadingSocialOwner,
    setIsLoadingSocialOwner,
  ] = useState(false);

  const [
    hasSocialOwnerLoadError,
    setHasSocialOwnerLoadError,
  ] = useState(false);

  const [
    viewedFollowedUserIds,
    setViewedFollowedUserIds,
  ] = useState<string[]>([]);

  const [
    viewedFollowerUserIds,
    setViewedFollowerUserIds,
  ] = useState<string[]>([]);

  const [
    isLoadingViewedConnections,
    setIsLoadingViewedConnections,
  ] = useState(false);

  const [
    hasViewedConnectionsLoadError,
    setHasViewedConnectionsLoadError,
  ] = useState(false);

  const [
    socialLoadAttempt,
    setSocialLoadAttempt,
  ] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoadingPosts(true);

      try {
        const publishedPosts =
          await getPublishedPosts();

        if (isMounted) {
          setAllPosts(publishedPosts);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load social taste matches:',
            error
          );
        }

        if (isMounted) {
          setAllPosts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPosts(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSocialOwner() {
      if (isOwnSocialProfile) {
        setSocialOwnerProfile(null);
        setHasSocialOwnerLoadError(false);
        setIsLoadingSocialOwner(false);
        return;
      }

      if (!socialOwnerId) {
        setSocialOwnerProfile(null);
        setHasSocialOwnerLoadError(true);
        setIsLoadingSocialOwner(false);
        return;
      }

      setHasSocialOwnerLoadError(false);
      setIsLoadingSocialOwner(true);

      try {
        const ownerProfile =
          await getProfileById(socialOwnerId);

        if (!ownerProfile) {
          throw new Error(
            'The requested profile could not be found.'
          );
        }

        if (isMounted) {
          setSocialOwnerProfile(ownerProfile);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load social profile owner:',
            error
          );
        }

        if (isMounted) {
          setSocialOwnerProfile(null);
          setHasSocialOwnerLoadError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSocialOwner(false);
        }
      }
    }

    void loadSocialOwner();

    return () => {
      isMounted = false;
    };
  }, [
    isOwnSocialProfile,
    socialLoadAttempt,
    socialOwnerId,
  ]);

  const resolvedSocialOwnerProfile =
    isOwnSocialProfile
      ? profile
      : socialOwnerProfile;

  const isApprovedFollowerOfOwner =
    !isOwnSocialProfile &&
    Boolean(socialOwnerId) &&
    followedUserIds.includes(socialOwnerId);

  const canViewSocialConnections =
    isOwnSocialProfile ||
    resolvedSocialOwnerProfile?.visibility ===
      'public' ||
    isApprovedFollowerOfOwner;

  useEffect(() => {
    let isMounted = true;

    async function loadViewedConnections() {
      if (isOwnSocialProfile) {
        setViewedFollowedUserIds([]);
        setViewedFollowerUserIds([]);
        setHasViewedConnectionsLoadError(false);
        setIsLoadingViewedConnections(false);
        return;
      }

      if (
        !socialOwnerId ||
        !resolvedSocialOwnerProfile
      ) {
        setViewedFollowedUserIds([]);
        setViewedFollowerUserIds([]);
        setHasViewedConnectionsLoadError(false);
        setIsLoadingViewedConnections(false);
        return;
      }

      if (
        resolvedSocialOwnerProfile.visibility ===
          'private' &&
        isLoading
      ) {
        setIsLoadingViewedConnections(true);
        return;
      }

      if (!canViewSocialConnections) {
        setViewedFollowedUserIds([]);
        setViewedFollowerUserIds([]);
        setHasViewedConnectionsLoadError(false);
        setIsLoadingViewedConnections(false);
        return;
      }

      setHasViewedConnectionsLoadError(false);
      setIsLoadingViewedConnections(true);

      try {
        const snapshot =
          await getFollowSnapshot(socialOwnerId);

        if (isMounted) {
          setViewedFollowedUserIds(
            snapshot.followedUserIds
          );
          setViewedFollowerUserIds(
            snapshot.followerUserIds
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load viewed profile connections:',
            error
          );
        }

        if (isMounted) {
          setViewedFollowedUserIds([]);
          setViewedFollowerUserIds([]);
          setHasViewedConnectionsLoadError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingViewedConnections(false);
        }
      }
    }

    void loadViewedConnections();

    return () => {
      isMounted = false;
    };
  }, [
    canViewSocialConnections,
    isLoading,
    isOwnSocialProfile,
    resolvedSocialOwnerProfile,
    socialLoadAttempt,
    socialOwnerId,
  ]);

  const displayedFollowedUserIds =
    isOwnSocialProfile
      ? followedUserIds
      : viewedFollowedUserIds;

  const displayedFollowerUserIds =
    isOwnSocialProfile
      ? followerUserIds
      : viewedFollowerUserIds;

  useEffect(() => {
    socialProfilesByIdRef.current = {};
    setSocialProfilesById({});
    setSearchQuery('');
  }, [socialOwnerId]);

  useEffect(() => {
    let isMounted = true;

    async function loadSocialProfiles() {
      const socialUserIds = Array.from(
        new Set([
          ...displayedFollowedUserIds,
          ...displayedFollowerUserIds,
        ])
      );

      if (socialUserIds.length === 0) {
        if (isMounted) {
          socialProfilesByIdRef.current = {};
          setSocialProfilesById({});
          setHasProfileLoadError(false);
          setIsLoadingProfiles(false);
        }

        return;
      }

      const missingUserIds =
        socialUserIds.filter(
          (userId) =>
            !socialProfilesByIdRef.current[
              userId
            ]
        );

      if (missingUserIds.length === 0) {
        if (isMounted) {
          setHasProfileLoadError(false);
          setIsLoadingProfiles(false);
        }

        return;
      }

      const isInitialLoad =
        Object.keys(
          socialProfilesByIdRef.current
        ).length === 0;

      if (isInitialLoad) {
        setHasProfileLoadError(false);
        setIsLoadingProfiles(true);
      }

      try {
        const profiles =
          await getProfilesByIds(
            missingUserIds
          );

        if (isMounted) {
          const loadedProfiles =
            buildProfileRecord(profiles);

          setHasProfileLoadError(false);

          setSocialProfilesById(
            (currentProfiles) => {
              const nextProfiles = {
                ...currentProfiles,
                ...loadedProfiles,
              };

              socialProfilesByIdRef.current =
                nextProfiles;

              return nextProfiles;
            }
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load social profiles:',
            error
          );
        }

        if (
          isMounted &&
          isInitialLoad
        ) {
          socialProfilesByIdRef.current = {};
          setSocialProfilesById({});
          setHasProfileLoadError(true);
        }
      } finally {
        if (
          isMounted &&
          isInitialLoad
        ) {
          setIsLoadingProfiles(false);
        }
      }
    }

    void loadSocialProfiles();

    return () => {
      isMounted = false;
    };
  }, [
    displayedFollowedUserIds,
    displayedFollowerUserIds,
    profileLoadAttempt,
  ]);

  const followingUsers = useMemo<
    UserProfile[]
  >(() => {
    return displayedFollowedUserIds
      .map(
        (userId) =>
          socialProfilesById[userId]
      )
      .filter(
        (user): user is UserProfile =>
          user !== undefined &&
          !blockedUserIds.includes(user.id)
      )
      .sort((first, second) =>
        first.displayName.localeCompare(
          second.displayName
        )
      );
  }, [
    displayedFollowedUserIds,
    blockedUserIds,
    socialProfilesById,
  ]);

  const followerUsers = useMemo<
    UserProfile[]
  >(() => {
    return displayedFollowerUserIds
      .map(
        (userId) =>
          socialProfilesById[userId]
      )
      .filter(
        (user): user is UserProfile =>
          user !== undefined &&
          !blockedUserIds.includes(user.id)
      )
      .sort((first, second) =>
        first.displayName.localeCompare(
          second.displayName
        )
      );
  }, [
    displayedFollowerUserIds,
    blockedUserIds,
    socialProfilesById,
  ]);

  const followingCount =
    followingUsers.length;

  const followerCount =
    followerUsers.length;

  const activeUsers =
    activeTab === 'following'
      ? followingUsers
      : followerUsers;

  const socialOwnerDisplayName =
    isOwnSocialProfile
      ? profile.displayName || 'You'
      : resolvedSocialOwnerProfile
          ?.displayName || 'This user';

  const isLoadingConnections =
    isLoading ||
    isLoadingSocialOwner ||
    isLoadingViewedConnections;

  const hasConnectionsLoadError =
    hasLoadError ||
    (!isOwnSocialProfile &&
      (hasSocialOwnerLoadError ||
        hasViewedConnectionsLoadError));

  const isConnectionsRestricted =
    !isOwnSocialProfile &&
    Boolean(resolvedSocialOwnerProfile) &&
    !canViewSocialConnections &&
    !isLoadingConnections;

  const filteredUsers = useMemo(() => {
    const normalizedQuery =
      normalizeValue(searchQuery);

    if (!normalizedQuery) {
      return activeUsers;
    }

    return activeUsers.filter((user) => {
      const searchableText = normalizeValue(
        `${user.displayName} ${user.username}`
      );

      return searchableText.includes(
        normalizedQuery
      );
    });
  }, [activeUsers, searchQuery]);

  const tasteMatchByUserId = useMemo(() => {
    const matches = new Map<
      string,
      ReturnType<
        typeof getTasteRecommendationForUser
      >
    >();

    activeUsers.forEach((user) => {
      matches.set(
        user.id,
        getTasteRecommendationForUser({
          posts: allPosts,
          profilesByUserId: socialProfilesById,
          currentUserId: profile.id,
          otherUserId: user.id,
        })
      );
    });

    return matches;
  }, [
  activeUsers,
  allPosts,
  socialProfilesById,
  profile.id,
]);

  function changeTab(tab: SocialTab) {
    setActiveTab(tab);
    setSearchQuery('');
    Keyboard.dismiss();
  }

  function openProfile(userId: string) {
    Keyboard.dismiss();

    router.push({
      pathname: '/public-profile',
      params: {
        userId,
      },
    });
  }

  function openTasteMatch(userId: string) {
    Keyboard.dismiss();

    router.push({
      pathname: '/taste-match',
      params: {
        userId,
      },
    });
  }

  function clearSearch() {
    setSearchQuery('');
    Keyboard.dismiss();
  }

  function handleFollowToggle(
    user: UserProfile
  ) {
    if (isFollowing(user.id)) {
      toggleFollow(user.id);
      return;
    }

    if (isFollowRequested(user.id)) {
      cancelFollowRequest(user.id);
      return;
    }

    if (user.visibility === 'private') {
      requestFollow(user.id);
      return;
    }

    toggleFollow(user.id);
  }

  function removeFollowedUser(
    userId: string
  ) {
    unfollowUser(userId);
  }

  function confirmRemoveFollower(
    user: UserProfile
  ) {
    setFollowerToRemove(user);
  }

  function getEmptyTitle() {
    if (searchQuery.trim()) {
      return 'No matching people';
    }

    if (!isOwnSocialProfile) {
      return activeTab === 'following'
        ? `${socialOwnerDisplayName} isn’t following anyone yet`
        : `${socialOwnerDisplayName} has no followers yet`;
    }

    if (activeTab === 'following') {
      return 'You’re not following anyone yet';
    }

    return 'No followers yet';
  }

  function getEmptyText() {
    const trimmedQuery =
      searchQuery.trim();

    if (trimmedQuery) {
      if (!isOwnSocialProfile) {
        return 'Try another name or username.';
      }

      return activeTab === 'following'
        ? `No one you follow matches “${trimmedQuery}”.`
        : `None of your followers match “${trimmedQuery}”.`;
    }

    if (!isOwnSocialProfile) {
      return 'There’s no one to show here yet.';
    }

    if (activeTab === 'following') {
      return (
        'Search for people in Discover and ' +
        'follow profiles you want to keep up with.'
      );
    }

    return (
      'Publish more Top 3s and connect with ' +
      'other people to grow your audience.'
    );
  }

  function getSearchPlaceholder() {
    if (isOwnSocialProfile) {
      return activeTab === 'following'
        ? 'Search people you follow'
        : 'Search people who follow you';
    }

    return activeTab === 'following'
      ? `Search people ${socialOwnerDisplayName} follows`
      : `Search ${socialOwnerDisplayName} followers`;
  }

  return (
    <>
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <View
        style={[
          styles.segmentedContainer,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <SegmentedControl<SocialTab>
          value={activeTab}
          options={[
            {
              value: 'followers',
              label: 'Followers',
              count: followerCount,
              accessibilityLabel:
                `Show ${followerCount} followers`,
            },
            {
              value: 'following',
              label: 'Following',
              count: followingCount,
              accessibilityLabel:
                `Show ${followingCount} following`,
            },
          ]}
          onChange={changeTab}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === 'ios'
            ? 'interactive'
            : 'on-drag'
        }
        onScrollBeginDrag={Keyboard.dismiss}>
        {!isLoadingConnections &&
        !isLoadingPosts &&
        !isLoadingProfiles &&
        canViewSocialConnections &&
        activeUsers.length > 0 ? (
          <View style={styles.searchWrapper}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={getSearchPlaceholder()}
              accessibilityLabel={getSearchPlaceholder()}
              onClear={clearSearch}
            />
          </View>
        ) : null}

        {isLoadingConnections ||
        isLoadingPosts ||
        isLoadingProfiles ? (
          <View style={styles.stateContainer}>
            <AppText
              variant="bodyLarge"
              tone="tertiary">
              Loading…
            </AppText>
          </View>
        ) : hasConnectionsLoadError ||
        hasProfileLoadError ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <Ionicons
              name="cloud-offline-outline"
              size={34}
              color={colors.tertiaryText}
            />

            <AppText
              variant="emptyStateTitle"
              style={styles.emptyTitle}>
              Couldn’t load connections
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyText}>
              Check your connection and try again.
            </AppText>

            <PrimaryButton
              title="Try Again"
              onPress={() => {
                retryFollowState();

                setSocialLoadAttempt(
                  (current) => current + 1
                );

                setProfileLoadAttempt(
                  (current) => current + 1
                );
              }}
              style={styles.retryButton}
            />
          </View>
        ) : isConnectionsRestricted ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <Ionicons
              name="lock-closed-outline"
              size={34}
              color={colors.tertiaryText}
            />

            <AppText
              variant="emptyStateTitle"
              style={styles.emptyTitle}>
              Connections are private
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyText}>
              Follow {socialOwnerDisplayName} and wait
              for their approval to view their followers
              and following.
            </AppText>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <Ionicons
              name={
                searchQuery.trim()
                  ? 'search-outline'
                  : activeTab === 'following'
                    ? 'people-outline'
                    : 'person-add-outline'
              }
              size={34}
              color={colors.tertiaryText}
            />

            <AppText
              variant="emptyStateTitle"
              style={styles.emptyTitle}>
              {getEmptyTitle()}
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyText}>
              {getEmptyText()}
            </AppText>
          </View>
        ) : (
          <View style={styles.userList}>
            {filteredUsers.map((user) => {
              const userIsFollowed =
                isFollowing(user.id);

              const userHasRequested =
                isFollowRequested(user.id);

              const followerActionLabel =
                userIsFollowed
                  ? 'Following'
                  : userHasRequested
                    ? 'Requested'
                    : 'Follow';

              const usesSecondaryActionStyle =
                userIsFollowed ||
                userHasRequested;

              const tasteMatch =
                tasteMatchByUserId.get(user.id);

              return (
                <View
                  key={user.id}
                  style={[
                    styles.userRow,
                    {
                      backgroundColor: colors.surface,
                    },
                  ]}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.profileAction,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      openProfile(user.id)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${user.displayName}'s profile`}>
                    <UserAvatar
                      displayName={user.displayName}
                      avatarUrl={user.avatarUrl}
                      size={50}
                      fontSize={20}
                    />

                    <View style={styles.userDetails}>
                      <AppText
                        variant="headline"
                        numberOfLines={1}>
                        {user.displayName}
                      </AppText>

                      <AppText
                        variant="subtitle"
                        tone="tertiary"
                        style={styles.username}
                        numberOfLines={1}>
                        @{user.username}
                      </AppText>

                      {tasteMatch ? (
                        <TasteMatchBadge
                          score={tasteMatch.score}
                          sharedPickCount={
                            tasteMatch.sharedPickCount
                          }
                          onPress={() =>
                            openTasteMatch(user.id)
                          }
                        />
                      ) : null}
                    </View>
                  </Pressable>

                  {isOwnSocialProfile &&
                  activeTab === 'following' ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.followingButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        removeFollowedUser(user.id)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Unfollow ${user.displayName}`}>
                      <AppText
                        variant="label"
                        tone="primary"
                        emphasis="strong">
                        Following
                      </AppText>
                    </Pressable>
                  ) : user.id === profile.id ? null :
                  isOwnSocialProfile ? (
                    <View style={styles.followerActions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.followerActionButton,
                          {
                            backgroundColor:
                              usesSecondaryActionStyle
                                ? colors.surface
                                : colors.primary,
                            borderColor:
                              usesSecondaryActionStyle
                                ? colors.border
                                : colors.primary,
                          },
                          pressed && styles.pressed,
                        ]}
                        onPress={() =>
                          handleFollowToggle(user)
                        }
                        accessibilityRole="button"
                        accessibilityState={{
                          selected:
                            userIsFollowed ||
                            userHasRequested,
                        }}
                        accessibilityLabel={
                          userIsFollowed
                            ? `Unfollow ${user.displayName}`
                            : userHasRequested
                              ? `Cancel follow request for ${user.displayName}`
                              : user.visibility === 'private'
                                ? `Request to follow ${user.displayName}`
                                : `Follow ${user.displayName}`
                        }>
                        <AppText
                          variant="label"
                          tone={
                            usesSecondaryActionStyle
                              ? 'primary'
                              : 'onPrimary'
                          }
                          emphasis="strong"
                          numberOfLines={1}>
                          {followerActionLabel}
                        </AppText>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.removeFollowerButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() =>
                          confirmRemoveFollower(user)
                        }
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${user.displayName} as a follower`}>
                        <Ionicons
                          name="close-outline"
                          size={20}
                          color={colors.tertiaryText}
                        />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.followerActionButton,
                        {
                          backgroundColor:
                            usesSecondaryActionStyle
                              ? colors.surface
                              : colors.primary,
                          borderColor:
                            usesSecondaryActionStyle
                              ? colors.border
                              : colors.primary,
                        },
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        handleFollowToggle(user)
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        selected:
                          userIsFollowed ||
                          userHasRequested,
                      }}
                      accessibilityLabel={
                        userIsFollowed
                          ? `Unfollow ${user.displayName}`
                          : userHasRequested
                            ? `Cancel follow request for ${user.displayName}`
                            : user.visibility === 'private'
                              ? `Request to follow ${user.displayName}`
                              : `Follow ${user.displayName}`
                      }>
                      <AppText
                        variant="label"
                        tone={
                          usesSecondaryActionStyle
                            ? 'primary'
                            : 'onPrimary'
                        }
                        emphasis="strong"
                        numberOfLines={1}>
                        {followerActionLabel}
                      </AppText>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
        </ScrollView>
      </SafeAreaView>

      <ActionSheet
        visible={followerToRemove !== null}
        title="Remove follower?"
        message={
          followerToRemove
            ? `${followerToRemove.displayName} will no longer follow you. They can request to follow you again in the future.`
            : ''
        }
        actions={[
          {
            label: 'Remove',
            variant: 'destructive',
            onPress: () => {
              if (followerToRemove) {
                removeFollower(followerToRemove.id);
              }

              setFollowerToRemove(null);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: () => {
              setFollowerToRemove(null);
            },
          },
        ]}
        onClose={() => {
          setFollowerToRemove(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  segmentedContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },

  searchWrapper: {
    marginBottom: 18,
  },


  stateContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 18,
  },

  emptyTitle: {
    marginTop: 12,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },

  userList: {
    gap: 12,
  },

  userRow: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },

  profileAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  userDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },

  username: {
    marginTop: 3,
  },

  followingButton: {
    minWidth: 94,
    minHeight: 38,
    marginLeft: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  followerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },

  removeFollowerButton: {
    width: 38,
    height: 38,
    marginLeft: 6,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  followerActionButton: {
    minWidth: 94,
    maxWidth: 150,
    minHeight: 38,
    marginLeft: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.68,
  },
});