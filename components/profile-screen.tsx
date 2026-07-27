import CommentsSheet from '@/components/comments-sheet';
import ProfileScreenContent from '@/components/profile-screen-content';
import ScreenHeader from '@/components/screen-header';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import {
    getHydratedFeedPosts,
    getMockUserById,
} from '@/services/post-service';
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

export default function ProfileScreen({
  userId,
  showBackButton = false,
}: ProfileScreenProps) {
  const { profile } = useProfile();

  const {
    posts,
    selectList,
  } = useTop3();

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

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  const viewedUser = useMemo<
    UserProfile | null
  >(() => {
    if (!userId || userId === profile.id) {
      return profile;
    }

    return getMockUserById(userId);
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

    async function loadPosts() {
      setIsLoadingPosts(true);

      try {
        const hydratedPosts =
          await getHydratedFeedPosts(posts);

        if (isMounted) {
          setAllPosts(hydratedPosts);
        }
      } catch (error) {
        console.error(
          'Failed to load profile posts:',
          error
        );

        if (isMounted) {
          setAllPosts(posts);
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
  }, [posts]);

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
      currentUserId: profile.id,
      otherUserId: viewedUserId,
    });
  }, [
    allPosts,
    isCurrentUser,
    isLoadingPosts,
    profile.id,
    viewedUserId,
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

    toggleFollow(viewedUserId);
  }

  function openComments(post: Post) {
    setSelectedCommentsPost(post);
  }

  function closeComments() {
    setSelectedCommentsPost(null);
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
              : userIsFollowed
                ? 1
                : 0
          }
          followingCount={
            isCurrentUser
              ? currentUserFollowingCount
              : 0
          }
          tasteMatchScore={
            tasteMatch?.score
          }
          tasteMatchSharedPickCount={
            tasteMatch?.sharedItems.length ?? 0
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