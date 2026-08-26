import ActionSheet from '@/components/action-sheet';
import ScreenHeader from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import SegmentedControl from '@/components/segmented-control';
import TasteMatchBadge from '@/components/taste-match-badge';
import { useBlock } from '@/context/block-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { getProfilesByIds } from '@/lib/supabase/profiles';
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
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  const params = useLocalSearchParams<{
    tab?: string | string[];
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
        console.error(
          'Failed to load social taste matches:',
          error
        );

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

    async function loadSocialProfiles() {
      const socialUserIds = Array.from(
        new Set([
          ...followedUserIds,
          ...followerUserIds,
        ])
      );

      if (socialUserIds.length === 0) {
        if (isMounted) {
          socialProfilesByIdRef.current = {};
          setSocialProfilesById({});
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
          setIsLoadingProfiles(false);
        }

        return;
      }

      const isInitialLoad =
        Object.keys(
          socialProfilesByIdRef.current
        ).length === 0;

      if (isInitialLoad) {
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
        console.error(
          'Failed to load social profiles:',
          error
        );

        if (
          isMounted &&
          isInitialLoad
        ) {
          socialProfilesByIdRef.current = {};
          setSocialProfilesById({});
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
  }, [followedUserIds, followerUserIds]);

  const followingUsers = useMemo<
    UserProfile[]
  >(() => {
    return followedUserIds
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
    followedUserIds,
    blockedUserIds,
    socialProfilesById,
  ]);

  const followerUsers = useMemo<
    UserProfile[]
  >(() => {
    return followerUserIds
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
    followerUserIds,
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

    if (activeTab === 'following') {
      return 'You’re not following anyone yet';
    }

    return 'No followers yet';
  }

  function getEmptyText() {
    const trimmedQuery =
      searchQuery.trim();

    if (trimmedQuery) {
      return activeTab === 'following'
        ? `No one you follow matches “${trimmedQuery}”.`
        : `None of your followers match “${trimmedQuery}”.`;
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
    if (activeTab === 'following') {
      return 'Search people you follow';
    }

    return 'Search people who follow you';
  }

  return (
    <>
      <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <View style={styles.segmentedContainer}>
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
        {!isLoading &&
        !isLoadingProfiles &&
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

        {isLoading ||
        isLoadingPosts ||
        isLoadingProfiles ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              Loading…
            </Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={
                searchQuery.trim()
                  ? 'search-outline'
                  : activeTab === 'following'
                    ? 'people-outline'
                    : 'person-add-outline'
              }
              size={34}
              color="#999999"
            />

            <Text style={styles.emptyTitle}>
              {getEmptyTitle()}
            </Text>

            <Text style={styles.emptyText}>
              {getEmptyText()}
            </Text>
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
                  style={styles.userRow}>
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
                    <View style={styles.avatar}>
                      {user.avatarUrl ? (
                        <Image
                          source={{
                            uri: user.avatarUrl,
                          }}
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text
                          style={styles.avatarText}>
                          {user.displayName
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <View style={styles.userDetails}>
                      <Text
                        style={styles.displayName}
                        numberOfLines={1}>
                        {user.displayName}
                      </Text>

                      <Text
                        style={styles.username}
                        numberOfLines={1}>
                        @{user.username}
                      </Text>

                      {tasteMatch ? (
                        <TasteMatchBadge
                          score={tasteMatch.score}
                          sharedPickCount={
                            tasteMatch.sharedItems.length
                          }
                          onPress={() =>
                            openTasteMatch(user.id)
                          }
                        />
                      ) : null}
                    </View>
                  </Pressable>

                  {activeTab === 'following' ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.followingButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        removeFollowedUser(user.id)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Unfollow ${user.displayName}`}>
                      <Text
                        style={
                          styles.followingButtonText
                        }>
                        Following
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.followerActions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.followerActionButton,
                          !usesSecondaryActionStyle &&
                            styles.followButton,
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
                        <Text
                          style={[
                            styles.followerActionText,
                            !usesSecondaryActionStyle &&
                              styles.followButtonText,
                          ]}
                          numberOfLines={1}>
                          {followerActionLabel}
                        </Text>
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
                          color="#777777"
                        />
                      </Pressable>
                    </View>
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
    backgroundColor: '#FAFAFA',
  },

  segmentedContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#FAFAFA',
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

  stateText: {
    fontSize: 16,
    color: '#777777',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 19,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: '#777777',
    textAlign: 'center',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
  },

  profileAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  userDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },

  displayName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },

  username: {
    marginTop: 3,
    fontSize: 14,
    color: '#777777',
  },

  followingButton: {
    minWidth: 94,
    minHeight: 38,
    marginLeft: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  followingButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
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
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  followerActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },

  followButton: {
    borderColor: '#222222',
    backgroundColor: '#222222',
  },

  followButtonText: {
    color: '#FFFFFF',
  },

  pressed: {
    opacity: 0.68,
  },
});