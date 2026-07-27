import CommentsSheet from '@/components/comments-sheet';
import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
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
import { buildPersonalizedFeed } from '@/utils/build-personalized-feed';
import { Ionicons } from '@expo/vector-icons';
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

function normalizeTopic(topic?: string) {
  return topic?.trim().toLowerCase() || 'general';
}

export default function FeedScreen() {
  const { profile } = useProfile();

  const {
    followedUserIds,
    isFollowing,
    toggleFollow,
    isLoading: isLoadingFollowState,
  } = useFollow();

  const {
    posts,
    selectList,
  } = useTop3();

  const [feedPosts, setFeedPosts] = useState<
    Post[]
  >([]);

  const [isLoadingFeed, setIsLoadingFeed] =
    useState(true);

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFeedPosts() {
      setIsLoadingFeed(true);

      try {
        const nextPosts =
          await getHydratedFeedPosts(posts);

        if (isMounted) {
          setFeedPosts(nextPosts);
        }
      } catch (error) {
        console.error(
          'Failed to load feed posts:',
          error
        );

        if (isMounted) {
          setFeedPosts(posts);
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeed(false);
        }
      }
    }

    loadFeedPosts();

    return () => {
      isMounted = false;
    };
  }, [posts]);

  const personalizedFeed = useMemo(
    () =>
      buildPersonalizedFeed({
        posts: feedPosts,
        currentUserId: profile.id,
        followedUserIds,
      }),
    [
      feedPosts,
      followedUserIds,
      profile.id,
    ]
  );

  const tasteMatchByUserId = useMemo(() => {
    const matches = new Map<
      string,
      ReturnType<
        typeof getTasteRecommendationForUser
      >
    >();

    const feedAuthorIds = new Set(
      personalizedFeed
        .filter(
          ({ post }) =>
            post.authorId !== profile.id
        )
        .map(({ post }) => post.authorId)
    );

    feedAuthorIds.forEach((authorId) => {
      matches.set(
        authorId,
        getTasteRecommendationForUser({
          posts: feedPosts,
          currentUserId: profile.id,
          otherUserId: authorId,
        })
      );
    });

    return matches;
  }, [
    feedPosts,
    personalizedFeed,
    profile.id,
  ]);

  function getPostAuthor(
    authorId: string
  ): UserProfile | null {
    if (authorId === profile.id) {
      return profile;
    }

    return getMockUserById(authorId);
  }

  function openAuthorProfile(
    authorId: string
  ) {
    if (authorId === profile.id) {
      router.push('/(tabs)/profile');
      return;
    }

    router.push({
      pathname: '/public-profile',
      params: {
        userId: authorId,
      },
    });
  }

  function openTasteMatch(
    authorId: string
  ) {
    if (authorId === profile.id) {
      return;
    }

    router.push({
      pathname: '/taste-match',
      params: {
        userId: authorId,
      },
    });
  }

  function openPost(post: Post) {
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
        category:
          post.collection.category,
        topic: normalizeTopic(
          post.collection.topic
        ),
      },
    });
  }

  function editCollection(post: Post) {
    selectList(post.collection.id);
    router.push('/collection');
  }

  function openComments(post: Post) {
    setSelectedCommentsPost(post);
  }

  function closeComments() {
    setSelectedCommentsPost(null);
  }

  function toggleAuthorFollow(
    authorId: string
  ) {
    if (
      authorId === profile.id ||
      isLoadingFollowState
    ) {
      return;
    }

    toggleFollow(authorId);
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {isLoadingFeed ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>
              Loading feed…
            </Text>
          </View>
        ) : personalizedFeed.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Nothing published yet
            </Text>

            <Text style={styles.emptyText}>
              Publish a completed Top 3 to see it
              here.
            </Text>
          </View>
        ) : (
          personalizedFeed.map(
            ({
              post,
              isSuggested,
            }) => {
              const author = getPostAuthor(
                post.authorId
              );

              if (!author) {
                return null;
              }

              const isCurrentUserPost =
                post.authorId === profile.id;

              const authorIsFollowed =
                isFollowing(post.authorId);

              const tasteMatch =
                !isCurrentUserPost
                  ? tasteMatchByUserId.get(
                      post.authorId
                    )
                  : null;

              return (
                <View
                  key={post.id}
                  style={styles.feedItem}>
                  {isSuggested ? (
                    <View
                      style={
                        styles.recommendationHeader
                      }>
                      <Ionicons
                        name="sparkles-outline"
                        size={16}
                        color="#555555"
                      />

                      <Text
                        style={
                          styles.recommendationTitle
                        }>
                        Recommended for you
                      </Text>
                    </View>
                  ) : null}

                  <Top3Card
                    post={post}
                    author={author}
                    showAuthor
                    tasteMatchScore={
                      tasteMatch?.score
                    }
                    tasteMatchSharedPickCount={
                      tasteMatch?.sharedItems
                        .length ?? 0
                    }
                    onTasteMatchPress={
                      tasteMatch
                        ? () =>
                            openTasteMatch(
                              post.authorId
                            )
                        : undefined
                    }
                    showFollowButton={
                      isSuggested &&
                      !isCurrentUserPost
                    }
                    isFollowingAuthor={
                      authorIsFollowed
                    }
                    isFollowLoading={
                      isLoadingFollowState
                    }
                    onFollowPress={
                      isSuggested &&
                      !isCurrentUserPost
                        ? () =>
                            toggleAuthorFollow(
                              post.authorId
                            )
                        : undefined
                    }
                    onAuthorPress={() =>
                      openAuthorProfile(
                        post.authorId
                      )
                    }
                    onTitlePress={() =>
                      openCollectionFeed(post)
                    }
                    onPress={() =>
                      openPost(post)
                    }
                    onEditPress={
                      isCurrentUserPost
                        ? () =>
                            editCollection(post)
                        : undefined
                    }
                    onCommentsPress={() =>
                      openComments(post)
                    }
                  />
                </View>
              );
            }
          )
        )}
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
    paddingBottom: 32,
  },

  feedItem: {
    marginBottom: 16,
  },

  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    paddingHorizontal: 4,
  },

  recommendationTitle: {
    marginLeft: 6,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#555555',
  },

  loadingState: {
    alignItems: 'center',
    paddingTop: 80,
  },

  loadingText: {
    fontSize: 16,
    color: '#777777',
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    marginBottom: 8,
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },

  emptyText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
    textAlign: 'center',
  },
});