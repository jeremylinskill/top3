import CommentsSheet from '@/components/comments-sheet';
import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import { useComments } from '@/context/comment-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAuth } from '@/hooks/use-auth';
import { getPublicProfilesByIds } from '@/lib/supabase/profiles';
import { getPublishedPosts } from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { buildPersonalizedFeed } from '@/utils/build-personalized-feed';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function normalizeTopic(topic?: string) {
  return topic?.trim().toLowerCase() || 'general';
}

function formatSuggestionReason(
  suggestionReason?: string
) {
  if (!suggestionReason) {
    return 'Because this matches your taste';
  }

  const formattedReason = suggestionReason.replace(
    /^Suggested because\s+/i,
    ''
  );

  if (
    /^You both ranked\s+/i.test(
      formattedReason
    )
  ) {
    return `Because ${formattedReason
      .charAt(0)
      .toLowerCase()}${formattedReason.slice(1)}`;
  }

  return formattedReason;
}

export default function FeedScreen() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();

  const { profile } = useProfile();

  const {
    followedUserIds,
    isFollowing,
    toggleFollow,
    isLoading: isLoadingFollowState,
  } = useFollow();

  const {
    posts,
  } = useTop3();

  const { loadCommentCounts } =
    useComments();

  const [feedPosts, setFeedPosts] = useState<
    Post[]
  >([]);

  const [feedAuthors, setFeedAuthors] =
    useState<Record<string, UserProfile>>({});

  const [isLoadingFeed, setIsLoadingFeed] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setFeedPosts([]);
      setFeedAuthors({});
      setIsLoadingFeed(false);
      return;
    }

    let isMounted = true;

    async function loadFeedPosts() {
      setIsLoadingFeed(true);

      try {
        const nextPosts =
          await getPublishedPosts();

        const authorIds = Array.from(
          new Set(
            nextPosts
              .map((post) => post.authorId)
              .filter(
                (authorId) =>
                  authorId !== profile.id
              )
          )
        );

        const authors =
          await getPublicProfilesByIds(
            authorIds
          );

        const nextFeedAuthors =
          authors.reduce<
            Record<string, UserProfile>
          >((authorMap, author) => {
            authorMap[author.id] = author;

            return authorMap;
          }, {});

        if (isMounted) {
          setFeedPosts(nextPosts);
          setFeedAuthors(nextFeedAuthors);
        }
      } catch (error) {
        console.error(
          'Failed to load feed posts:',
          error
        );

        if (isMounted) {
          setFeedPosts(posts);
          setFeedAuthors({});
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeed(false);
        }
      }
    }

    void loadFeedPosts();

    return () => {
      isMounted = false;
    };
  }, [
    isAuthenticated,
    isAuthLoading,
    posts,
    profile.id,
  ]);

  const personalizedFeed = useMemo(
  () =>
    buildPersonalizedFeed({
      posts: feedPosts,
      profilesByUserId: feedAuthors,
      currentUserId: profile.id,
      followedUserIds,
    }),
    [
      feedPosts,
      feedAuthors,
      followedUserIds,
      profile.id,
    ]
  );

  const feedCollectionIds = useMemo(
    () =>
      Array.from(
        new Set(
          personalizedFeed.map(
            ({ post }) =>
              post.collection.id
          )
        )
      ),
    [personalizedFeed]
  );

  const feedCollectionIdsKey = useMemo(
    () =>
      [...feedCollectionIds]
        .sort()
        .join('|'),
    [feedCollectionIds]
  );

  useEffect(() => {
    if (
      isLoadingFeed ||
      !feedCollectionIdsKey
    ) {
      return;
    }

    const collectionIds =
      feedCollectionIdsKey.split('|');

    void loadCommentCounts(collectionIds);
  }, [
    isLoadingFeed,
    feedCollectionIdsKey,
    loadCommentCounts,
  ]);

  function getPostAuthor(
    authorId: string
  ): UserProfile | null {
    if (authorId === profile.id) {
      return profile;
    }

    return feedAuthors[authorId] ?? null;
  }

  function openAuthorProfile(
    authorId: string
  ) {
    router.push({
      pathname: '/public-profile',
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
    router.push({
      pathname: '/collection',
      params: {
        listId: post.collection.id,
      },
    });
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

  async function refreshFeed() {
    if (!isAuthenticated || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const nextPosts =
        await getPublishedPosts();

      const authorIds = Array.from(
        new Set(
          nextPosts
            .map((post) => post.authorId)
            .filter(
              (authorId) =>
                authorId !== profile.id
            )
        )
      );

      const authors =
        await getPublicProfilesByIds(
          authorIds
        );

      const nextFeedAuthors =
        authors.reduce<
          Record<string, UserProfile>
        >((authorMap, author) => {
          authorMap[author.id] = author;

          return authorMap;
        }, {});

      setFeedPosts(nextPosts);
      setFeedAuthors(nextFeedAuthors);
    } catch (error) {
      console.error(
        'Failed to refresh feed posts:',
        error
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={[
        'top',
        'left',
        'right',
      ]}>
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFeed}
          />
        }>
        {isLoadingFeed ? (
          <View
            style={styles.loadingState}>
            <Text
              style={styles.loadingText}>
              Loading feed…
            </Text>
          </View>
        ) : personalizedFeed.length ===
          0 ? (
          <View
            style={styles.emptyState}>
            <Text
              style={styles.emptyTitle}>
              Nothing published yet
            </Text>

            <Text
              style={styles.emptyText}>
              Publish a completed Top 3 to
              see it here.
            </Text>
          </View>
        ) : (
          personalizedFeed.map(
            ({
              post,
              isSuggested,
              suggestionReason,
              sharedItemTitles,
            }) => {
              const author =
                getPostAuthor(
                  post.authorId
                );

              if (!author) {
                return null;
              }

              const isCurrentUserPost =
                post.authorId ===
                profile.id;

              const authorIsFollowed =
                isFollowing(
                  post.authorId
                );

              return (
                <View
                  key={post.id}
                  style={
                    styles.feedItem
                  }>
                  <Top3Card
                    post={post}
                    author={author}
                    showAuthor
                    recommendationTitle={
                      isSuggested
                        ? 'Recommended for you'
                        : undefined
                    }
                    recommendationReason={
                      isSuggested
                        ? formatSuggestionReason(
                            suggestionReason
                          )
                        : undefined
                    }
                    tasteMatchItemTitles={
                      isSuggested
                        ? sharedItemTitles
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
                      openCollectionFeed(
                        post
                      )
                    }
                    onPress={() =>
                      openPost(post)
                    }
                    onEditPress={
                      isCurrentUserPost
                        ? () =>
                            editCollection(
                              post
                            )
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
