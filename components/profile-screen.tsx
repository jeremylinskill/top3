import CommentsSheet from '@/components/comments-sheet';
import ProfileScreenContent from '@/components/profile-screen-content';
import ScreenHeader from '@/components/screen-header';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAuth } from '@/hooks/use-auth';
import type { FollowCounts } from '@/lib/supabase/follows';
import { getFollowCounts } from '@/lib/supabase/follows';
import { getPublicProfileById } from '@/lib/supabase/profiles';
import { getPublishedPostsByUser } from '@/services/post-service';
import { getTasteRecommendationForUser } from '@/services/taste-recommendation-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { router } from 'expo-router';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileScreenProps = {
  userId?: string;
  showBackButton?: boolean;
};

function normalizeTopic(topic?: string) {
  return topic?.trim().toLowerCase() || 'general';
}

function normalizeItemTitle(title?: string) {
  return title?.trim().toLowerCase() ?? '';
}

function sortPostsByPublishedDate(
  posts: Post[]
): Post[] {
  return [...posts].sort(
    (first, second) =>
      new Date(second.publishedAt).getTime() -
      new Date(first.publishedAt).getTime()
  );
}

function mergePosts(
  firstPosts: Post[],
  secondPosts: Post[]
): Post[] {
  const postsById = new Map<string, Post>();

  firstPosts.forEach((post) => {
    postsById.set(post.id, post);
  });

  secondPosts.forEach((post) => {
    postsById.set(post.id, post);
  });

  return sortPostsByPublishedDate(
    Array.from(postsById.values())
  );
}

export default function ProfileScreen({
  userId,
  showBackButton = false,
}: ProfileScreenProps) {
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const { selectList } = useTop3();

  const {
    isFollowing,
    toggleFollow,
    getFollowingCount,
    getFollowerCount,
    isLoading: isLoadingFollowState,
  } = useFollow();

  const [allPosts, setAllPosts] = useState<
    Post[]
  >([]);

  const [isLoadingPosts, setIsLoadingPosts] =
    useState(true);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [
    viewedUserFollowCounts,
    setViewedUserFollowCounts,
  ] = useState<FollowCounts>({
    followingCount: 0,
    followerCount: 0,
  });

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  const [viewedUser, setViewedUser] = useState<
    UserProfile | null
  >(() =>
    !userId || userId === profile.id
      ? profile
      : null
  );

  const [isLoadingProfile, setIsLoadingProfile] =
    useState(
      Boolean(userId && userId !== profile.id)
    );

  useEffect(() => {
    let isMounted = true;

    async function loadViewedUser() {
      if (!userId || userId === profile.id) {
        setViewedUser(profile);
        setIsLoadingProfile(false);
        return;
      }

      setViewedUser(null);
      setIsLoadingProfile(true);

      try {
        const publicProfile =
          await getPublicProfileById(userId);

        if (isMounted) {
          setViewedUser(publicProfile);
        }
      } catch (error) {
        console.error(
          'Failed to load public profile:',
          error
        );

        if (isMounted) {
          setViewedUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadViewedUser();

    return () => {
      isMounted = false;
    };
  }, [profile, userId]);

  const isCurrentUser =
    viewedUser?.id === profile.id;

  const viewedUserId = viewedUser?.id;

  const userIsFollowed =
    viewedUserId && !isCurrentUser
      ? isFollowing(viewedUserId)
      : false;

  const currentUserFollowingCount =
    getFollowingCount();

  const currentUserFollowerCount =
    getFollowerCount();

  useEffect(() => {
    let isMounted = true;

    async function loadViewedUserFollowCounts() {
      if (!viewedUserId || isCurrentUser) {
        if (isMounted) {
          setViewedUserFollowCounts({
            followingCount: 0,
            followerCount: 0,
          });
        }

        return;
      }

      try {
        const followCounts =
          await getFollowCounts(viewedUserId);

        if (isMounted) {
          setViewedUserFollowCounts(
            followCounts
          );
        }
      } catch (error) {
        console.error(
          'Failed to load profile follow counts:',
          error
        );

        if (isMounted) {
          setViewedUserFollowCounts({
            followingCount: 0,
            followerCount: 0,
          });
        }
      }
    }

    loadViewedUserFollowCounts();

    return () => {
      isMounted = false;
    };
  }, [isCurrentUser, viewedUserId]);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      if (!viewedUserId) {
        if (isMounted) {
          setAllPosts([]);
          setIsLoadingPosts(false);
        }

        return;
      }

      setIsLoadingPosts(true);

      try {
        const currentUserPostsPromise =
          getPublishedPostsByUser(profile.id);

        if (viewedUserId === profile.id) {
          const currentUserPosts =
            await currentUserPostsPromise;

          if (isMounted) {
            setAllPosts(currentUserPosts);
          }

          return;
        }

        const [
          currentUserPosts,
          viewedUserPosts,
        ] = await Promise.all([
          currentUserPostsPromise,
          getPublishedPostsByUser(viewedUserId),
        ]);

        if (isMounted) {
          setAllPosts(
            mergePosts(
              currentUserPosts,
              viewedUserPosts
            )
          );
        }
      } catch (error) {
        console.error(
          'Failed to load profile posts:',
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
  }, [profile.id, viewedUserId]);

  const publishedPosts = useMemo(() => {
    if (!viewedUserId) {
      return [];
    }

    return allPosts
      .filter(
        (post) =>
          post.authorId === viewedUserId
      )
      .sort(
        (first, second) =>
          new Date(
            second.publishedAt
          ).getTime() -
          new Date(
            first.publishedAt
          ).getTime()
      );
  }, [allPosts, viewedUserId]);

  const tasteMatch = useMemo(() => {
    if (
      !viewedUserId ||
      isCurrentUser ||
      isLoadingPosts
    ) {
      return null;
    }

   return getTasteRecommendationForUser({
  posts: allPosts,
  profilesByUserId: {
    [viewedUser.id]: viewedUser,
  },
  currentUserId: profile.id,
  otherUserId: viewedUserId,
});
  }, [
    allPosts,
    isCurrentUser,
    isLoadingPosts,
    profile.id,
    viewedUser,
    viewedUserId,
  ]);

  const tasteMatchItemTitlesByPostId =
    useMemo<Record<string, string[]>>(() => {
      if (
        isCurrentUser ||
        !tasteMatch
      ) {
        return {};
      }

      const normalizedSharedItems = new Set(
        tasteMatch.sharedItems
          .map(normalizeItemTitle)
          .filter(Boolean)
      );

      return publishedPosts.reduce<
        Record<string, string[]>
      >((matchesByPostId, post) => {
        const matchingTitles =
          post.collection.items
            .filter(
              (
                item
              ): item is NonNullable<
                typeof item
              > => item !== null
            )
            .map((item) => item.title.trim())
            .filter(Boolean)
            .filter((title) =>
              normalizedSharedItems.has(
                normalizeItemTitle(title)
              )
            );

        if (matchingTitles.length > 0) {
          matchesByPostId[post.id] =
            matchingTitles;
        }

        return matchesByPostId;
      }, {});
    }, [
      isCurrentUser,
      publishedPosts,
      tasteMatch,
    ]);

  function openPublishedPost(post: Post) {
    router.push({
      pathname: '/published-top3',
      params: {
        postId: post.id,
      },
    });
  }

  function openCollectionFeed(post: Post) {
    router.push({
      pathname: '/category-feed',
      params: {
        category: post.collection.category,
        topic: normalizeTopic(
          post.collection.topic
        ),
      },
    });
  }

  function editCollection(post: Post) {
    if (!isCurrentUser) {
      return;
    }

    selectList(post.collection.id);
    router.push('/collection');
  }

  function editProfile() {
    if (!isCurrentUser) {
      return;
    }

    router.push('/edit-profile');
  }

  async function handleSignOut() {
    if (!isCurrentUser || isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error) {
      console.error(
        'Failed to sign out:',
        error
      );

      Alert.alert(
        'Unable to Sign Out',
        'Something went wrong while signing you out. Please try again.'
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  function openFollowing() {
    router.push({
      pathname: '/social',
      params: {
        tab: 'following',
      },
    });
  }

  function openFollowers() {
    router.push({
      pathname: '/social',
      params: {
        tab: 'followers',
      },
    });
  }

  function openTasteMatch() {
    if (!viewedUserId || isCurrentUser) {
      return;
    }

    router.push({
      pathname: '/taste-match',
      params: {
        userId: viewedUserId,
      },
    });
  }

  function handleToggleFollow() {
    if (
      !viewedUserId ||
      isCurrentUser ||
      isLoadingFollowState
    ) {
      return;
    }

    setViewedUserFollowCounts(
      (currentCounts) => ({
        ...currentCounts,
        followerCount: Math.max(
          0,
          currentCounts.followerCount +
            (userIsFollowed ? -1 : 1)
        ),
      })
    );

    toggleFollow(viewedUserId);
  }

  function openComments(post: Post) {
    setSelectedCommentsPost(post);
  }

  function closeComments() {
    setSelectedCommentsPost(null);
  }

  if (isLoadingProfile) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right']}>
        <ScreenHeader
          showBackButton={showBackButton}
        />

        <View style={styles.messageContainer}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!viewedUser) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right']}>
        <ScreenHeader
          title="Profile Not Found"
          showBackButton={showBackButton}
        />

        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>
            This profile is unavailable
          </Text>

          <Text style={styles.messageText}>
            The user may no longer exist or the
            profile could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader
        showBackButton={showBackButton}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ProfileScreenContent
          user={viewedUser}
          publishedPosts={publishedPosts}
          isCurrentUser={isCurrentUser}
          followerCount={
            isCurrentUser
              ? currentUserFollowerCount
              : viewedUserFollowCounts.followerCount
          }
          followingCount={
            isCurrentUser
              ? currentUserFollowingCount
              : viewedUserFollowCounts.followingCount
          }
          tasteMatchScore={
            tasteMatch?.score
          }
          tasteMatchSharedPickCount={
            tasteMatch?.sharedItems.length ?? 0
          }
          tasteMatchItemTitlesByPostId={
            tasteMatchItemTitlesByPostId
          }
          onTasteMatchPress={
            tasteMatch
              ? openTasteMatch
              : undefined
          }
          onFollowersPress={
            isCurrentUser
              ? openFollowers
              : undefined
          }
          onFollowingPress={
            isCurrentUser
              ? openFollowing
              : undefined
          }
          isLoadingPosts={isLoadingPosts}
          isFollowing={userIsFollowed}
          isLoadingFollowState={
            isLoadingFollowState
          }
          onEditProfile={
            isCurrentUser
              ? editProfile
              : undefined
          }
          onSignOut={
            isCurrentUser
              ? handleSignOut
              : undefined
          }
          onToggleFollow={
            isCurrentUser
              ? undefined
              : handleToggleFollow
          }
          onTitlePress={openCollectionFeed}
          onPostPress={openPublishedPost}
          onEditPost={
            isCurrentUser
              ? editCollection
              : undefined
          }
          onCommentsPress={openComments}
        />
      </ScrollView>

      <CommentsSheet
        visible={
          selectedCommentsPost !== null
        }
        post={selectedCommentsPost}
        onClose={closeComments}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  messageContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#777777',
  },

  messageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
    textAlign: 'center',
  },
});