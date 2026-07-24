import CommentsSheet from '@/components/comments-sheet';
import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useComments } from '@/context/comment-context';
import { useLike } from '@/context/like-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import {
    getHydratedFeedPosts,
    getMockUserById,
} from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import {
    calculateCommunityTop3,
    CommunityTop3Result,
} from '@/utils/calculate-community-top3';
import { Ionicons } from '@expo/vector-icons';
import {
    router,
    useLocalSearchParams,
} from 'expo-router';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CategoryView = 'lists' | 'overall';

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function formatTopicLabel(topic: string) {
  return topic
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

export default function CategoryFeedScreen() {
  const params = useLocalSearchParams<{
    category?: string | string[];
    topic?: string | string[];
  }>();

  const categoryId = Array.isArray(
    params.category
  )
    ? params.category[0]
    : params.category;

  const topicParam = Array.isArray(
    params.topic
  )
    ? params.topic[0]
    : params.topic;

  const normalizedTopic =
    normalizeValue(topicParam) || 'general';

  const { profile } = useProfile();

  const {
    posts,
    selectList,
  } = useTop3();

  const {
    isLiked,
    toggleLike,
    getLikeCount,
    isLoading: isLoadingLikes,
  } = useLike();

  const {
    getCommentCount,
    isLoading: isLoadingComments,
  } = useComments();

  const [allPosts, setAllPosts] = useState<
    Post[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [activeView, setActiveView] =
    useState<CategoryView>('lists');

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  const category = TOP3_CATEGORIES.find(
    (item) =>
      normalizeValue(item.id) ===
      normalizeValue(categoryId)
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);

      try {
        const hydratedPosts =
          await getHydratedFeedPosts(posts);

        if (isMounted) {
          setAllPosts(hydratedPosts);
        }
      } catch (error) {
        console.error(
          'Failed to load category feed:',
          error
        );

        if (isMounted) {
          setAllPosts(posts);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!categoryId) {
      return [];
    }

    const normalizedCategory =
      normalizeValue(categoryId);

    return allPosts
      .filter((post) => {
        const postCategory =
          normalizeValue(
            post.collection.category
          );

        if (
          postCategory !== normalizedCategory
        ) {
          return false;
        }

        const postTopic =
          normalizeValue(
            post.collection.topic
          ) || 'general';

        if (normalizedTopic === 'general') {
          return postTopic === 'general';
        }

        return postTopic === normalizedTopic;
      })
      .sort(
        (first, second) =>
          new Date(
            second.publishedAt
          ).getTime() -
          new Date(
            first.publishedAt
          ).getTime()
      );
  }, [
    allPosts,
    categoryId,
    normalizedTopic,
  ]);

  const overallResult = useMemo<
    CommunityTop3Result | null
  >(() => {
    if (!categoryId) {
      return null;
    }

    return calculateCommunityTop3(
      allPosts,
      {
        category: categoryId,
        topic: normalizedTopic,
      }
    );
  }, [
    allPosts,
    categoryId,
    normalizedTopic,
  ]);

  const communityPost = useMemo<Post | null>(
    () => {
      if (!overallResult || !categoryId) {
        return null;
      }

      const normalizedCategory =
        normalizeValue(categoryId);

      const postId =
        `community-${normalizedCategory}-` +
        normalizedTopic;

      const items: Post['collection']['items'] =
        [
          overallResult.items[0]?.item ?? null,
          overallResult.items[1]?.item ?? null,
          overallResult.items[2]?.item ?? null,
        ];

      const title =
        normalizedTopic === 'general'
          ? `Top 3 ${
              category?.name ??
              overallResult.category
            } Overall`
          : `Top 3 ${formatTopicLabel(
              topicParam ?? normalizedTopic
            )} Overall`;

      const stableDate =
        new Date(0).toISOString();

      return {
        id: postId,
        authorId: 'community',
        collection: {
          id: postId,
          category: categoryId,
          topic:
            normalizedTopic === 'general'
              ? undefined
              : normalizedTopic,
          title,
          items,
          createdAt: stableDate,
          updatedAt: stableDate,
          publishedAt: stableDate,
        },
        publishedAt: stableDate,
        reactions: 0,
        comments: 0,
      };
    },
    [
      overallResult,
      categoryId,
      category?.name,
      normalizedTopic,
      topicParam,
    ]
  );

  const communityIsLiked = communityPost
    ? isLiked(communityPost.id)
    : false;

  const displayedCommunityLikeCount =
    communityPost
      ? getLikeCount(
          communityPost.id,
          communityPost.reactions
        )
      : 0;

  const displayedCommunityCommentCount =
    communityPost
      ? getCommentCount(
          communityPost.id,
          communityPost.comments
        )
      : 0;

  const communityHasComments =
    displayedCommunityCommentCount > 0;

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

  function openPost(post: Post) {
    if (post.authorId === profile.id) {
      selectList(post.collection.id);
      router.push('/collection');
      return;
    }

    router.push({
      pathname: '/published-top3',
      params: {
        postId: post.id,
      },
    });
  }

  function openComments(post: Post) {
    setSelectedCommentsPost(post);
  }

  function closeComments() {
    setSelectedCommentsPost(null);
  }

  function handleCommunityLike() {
    if (
      !communityPost ||
      isLoadingLikes
    ) {
      return;
    }

    toggleLike(communityPost.id);
  }

  function openCommunityComments() {
    if (!communityPost) {
      return;
    }

    setSelectedCommentsPost(
      communityPost
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader showBackButton />

        <View style={styles.loadingState}>
          <ActivityIndicator
            size="small"
            color="#222222"
          />

          <Text style={styles.loadingText}>
            Loading published Top 3s…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!categoryId || !category) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader showBackButton />

        <View style={styles.messageState}>
          <Text style={styles.messageTitle}>
            Category unavailable
          </Text>

          <Text style={styles.messageText}>
            This category could not be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isTopicFeed =
    normalizedTopic !== 'general';

  const topicLabel = isTopicFeed
    ? formatTopicLabel(
        topicParam ?? normalizedTopic
      )
    : null;

  const overallTitle = topicLabel
    ? `Top 3 ${topicLabel} Overall`
    : `Top 3 ${category.name} Overall`;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <View style={styles.segmentedContainer}>
        <View style={styles.segmentedControl}>
          <Pressable
            style={[
              styles.segment,
              activeView === 'lists' &&
                styles.activeSegment,
            ]}
            onPress={() =>
              setActiveView('lists')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected:
                activeView === 'lists',
            }}
            accessibilityLabel="Show published lists">
            <Text
              style={[
                styles.segmentText,
                activeView === 'lists' &&
                  styles.activeSegmentText,
              ]}>
              Lists
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segment,
              activeView === 'overall' &&
                styles.activeSegment,
            ]}
            onPress={() =>
              setActiveView('overall')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected:
                activeView === 'overall',
            }}
            accessibilityLabel="Show overall ranking">
            <Text
              style={[
                styles.segmentText,
                activeView === 'overall' &&
                  styles.activeSegmentText,
              ]}>
              Overall
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {activeView === 'lists' ? (
          filteredPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                Nothing published yet
              </Text>

              <Text style={styles.emptyText}>
                Published Top 3 lists in this
                category and topic will appear
                here.
              </Text>
            </View>
          ) : (
            <View style={styles.postList}>
              {filteredPosts.map((post) => {
                const author = getPostAuthor(
                  post.authorId
                );

                if (!author) {
                  return null;
                }

                return (
                  <Top3Card
                    key={post.id}
                    post={post}
                    author={author}
                    showAuthor
                    onAuthorPress={() =>
                      openAuthorProfile(
                        post.authorId
                      )
                    }
                    onPress={() =>
                      openPost(post)
                    }
                    onCommentsPress={() =>
                      openComments(post)
                    }
                  />
                );
              })}
            </View>
          )
        ) : !overallResult ||
          overallResult.items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Not enough rankings yet
            </Text>

            <Text style={styles.emptyText}>
              Publish matching Top 3 lists to
              build the overall ranking.
            </Text>
          </View>
        ) : (
          <View style={styles.overallCard}>
            <View style={styles.overallTitleRow}>
              <Text
                style={
                  styles.overallCategoryIcon
                }>
                {category.icon}
              </Text>

              <Text
                style={styles.overallCardTitle}>
                {overallTitle}
              </Text>
            </View>

            <View style={styles.rankingContent}>
              {overallResult.items.map(
                (entry, index) => (
                  <View
                    key={entry.item.id}
                    style={[
                      styles.rankRow,
                      index <
                        overallResult.items.length -
                          1 &&
                        styles.rankDivider,
                    ]}>
                    <Text
                      style={styles.rankNumber}>
                      {index + 1}
                    </Text>

                    {entry.item.imageUrl ? (
                      <Image
                        source={{
                          uri: entry.item.imageUrl,
                        }}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={
                          styles.imagePlaceholder
                        }>
                        <Text
                          style={
                            styles.placeholderText
                          }>
                          {entry.item.title
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View
                      style={styles.itemDetails}>
                      <Text
                        style={styles.itemTitle}
                        numberOfLines={2}>
                        {entry.item.title}
                      </Text>

                      {entry.item.subtitle ? (
                        <Text
                          style={
                            styles.itemSubtitle
                          }
                          numberOfLines={1}>
                          {entry.item.subtitle}
                        </Text>
                      ) : null}

                      {typeof entry.item.rating ===
                      'number' ? (
                        <Text
                          style={
                            styles.itemRating
                          }>
                          {entry.item.rating.toFixed(
                            1
                          )}{' '}
                          ★
                        </Text>
                      ) : null}

                      <Text
                        style={styles.scoreText}>
                        {entry.score}{' '}
                        {entry.score === 1
                          ? 'point'
                          : 'points'}{' '}
                        · {entry.appearanceCount}{' '}
                        {entry.appearanceCount === 1
                          ? 'list'
                          : 'lists'}
                      </Text>
                    </View>
                  </View>
                )
              )}
            </View>

            <View style={styles.overallFooter}>
              <View style={styles.sourceItem}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color="#777777"
                />

                <Text style={styles.footerText}>
                  Based on{' '}
                  {overallResult.totalLists}{' '}
                  {overallResult.totalLists === 1
                    ? 'published list'
                    : 'published lists'}
                </Text>
              </View>

              <View style={styles.engagement}>
                <Pressable
                  style={({ pressed }) => [
                    styles.engagementButton,
                    pressed && styles.pressed,
                    isLoadingLikes &&
                      styles.disabled,
                  ]}
                  onPress={handleCommunityLike}
                  disabled={
                    !communityPost ||
                    isLoadingLikes
                  }
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected:
                      communityIsLiked,
                    disabled:
                      !communityPost ||
                      isLoadingLikes,
                  }}
                  accessibilityLabel={
                    communityIsLiked
                      ? `Unlike ${overallTitle}`
                      : `Like ${overallTitle}`
                  }>
                  <Ionicons
                    name={
                      communityIsLiked
                        ? 'heart'
                        : 'heart-outline'
                    }
                    size={17}
                    color={
                      communityIsLiked
                        ? '#FF3B30'
                        : '#777777'
                    }
                  />

                  <Text
                    style={[
                      styles.engagementText,
                      communityIsLiked &&
                        styles
                          .activeEngagementText,
                    ]}>
                    {
                      displayedCommunityLikeCount
                    }
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.engagementButton,
                    pressed && styles.pressed,
                    isLoadingComments &&
                      styles.disabled,
                  ]}
                  onPress={
                    openCommunityComments
                  }
                  disabled={
                    !communityPost ||
                    isLoadingComments
                  }
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled:
                      !communityPost ||
                      isLoadingComments,
                  }}
                  accessibilityLabel={`Open comments for ${overallTitle}`}>
                  <Ionicons
                    name={
                      communityHasComments
                        ? 'chatbubble'
                        : 'chatbubble-outline'
                    }
                    size={15}
                    color={
                      communityHasComments
                        ? '#222222'
                        : '#777777'
                    }
                  />

                  <Text
                    style={[
                      styles.engagementText,
                      communityHasComments &&
                        styles
                          .activeEngagementText,
                    ]}>
                    {
                      displayedCommunityCommentCount
                    }
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
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

  segmentedContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#FAFAFA',
  },

  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 12,
  },

  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },

  activeSegment: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },

  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#777777',
  },

  activeSegmentText: {
    color: '#222222',
    fontWeight: '700',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },

  postList: {
    gap: 16,
  },

  overallCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
    overflow: 'hidden',
  },

  overallTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: '#EAEAEA',
  },

  overallCategoryIcon: {
    marginRight: 9,
    fontSize: 22,
  },

  overallCardTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#222222',
  },

  rankingContent: {
    paddingHorizontal: 18,
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },

  rankDivider: {
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: '#EAEAEA',
  },

  rankNumber: {
    width: 30,
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
  },

  itemImage: {
    width: 70,
    height: 105,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: '#EEEEEE',
  },

  imagePlaceholder: {
    width: 70,
    height: 105,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#888888',
  },

  itemDetails: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#222222',
  },

  itemSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    color: '#777777',
  },

  itemRating: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },

  scoreText: {
    marginTop: 7,
    fontSize: 13,
    color: '#999999',
  },

  overallFooter: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#EAEAEA',
  },

  sourceItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },

  footerText: {
    flexShrink: 1,
    marginLeft: 6,
    fontSize: 13,
    color: '#777777',
  },

  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  engagementButton: {
    minWidth: 38,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  engagementText: {
    marginLeft: 5,
    fontSize: 13,
    color: '#777777',
  },

  activeEngagementText: {
    color: '#222222',
    fontWeight: '600',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: '#777777',
    textAlign: 'center',
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 90,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#777777',
  },

  messageState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 90,
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

  pressed: {
    opacity: 0.68,
  },

  disabled: {
    opacity: 0.5,
  },
});