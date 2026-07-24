import CommentsSheet from '@/components/comments-sheet';
import ScreenHeader from '@/components/screen-header';
import { useComments } from '@/context/comment-context';
import { useLike } from '@/context/like-context';
import { useTop3 } from '@/context/top3-context';
import { getHydratedFeedPosts } from '@/services/post-service';
import { Post } from '@/types/post';
import {
    calculateCommunityTop3,
    CommunityTop3Result,
} from '@/utils/calculate-community-top3';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
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

function normalizeRouteValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

export default function CommunityTop3Screen() {
  const params = useLocalSearchParams<{
    category?: string | string[];
    topic?: string | string[];
  }>();

  const category = Array.isArray(
    params.category
  )
    ? params.category[0]
    : params.category;

  const topic = Array.isArray(params.topic)
    ? params.topic[0]
    : params.topic;

  const { posts } = useTop3();

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

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

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
          'Failed to load overall Top 3:',
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

  const result = useMemo<
    CommunityTop3Result | null
  >(() => {
    if (!category) {
      return null;
    }

    return calculateCommunityTop3(
      allPosts,
      {
        category,
        topic,
      }
    );
  }, [allPosts, category, topic]);

  const communityPost = useMemo<Post | null>(
    () => {
      if (!result) {
        return null;
      }

      const normalizedCategory =
        normalizeRouteValue(result.category);

      const normalizedTopic =
        normalizeRouteValue(result.topic) ||
        'general';

      const postId =
        `community-${normalizedCategory}-` +
        normalizedTopic;

      const communityItems: Post['collection']['items'] =
        [
          result.items[0]?.item ?? null,
          result.items[1]?.item ?? null,
          result.items[2]?.item ?? null,
        ];

      const title =
        result.topic === 'general'
          ? `Overall Top 3 ${result.category}`
          : `Overall Top 3 ${result.topic}`;

      return {
        id: postId,
        authorId: 'community',
        collection: {
          id: postId,
          category: result.category,
          topic:
            result.topic === 'general'
              ? undefined
              : result.topic,
          title,
          items: communityItems,
          createdAt:
            new Date(0).toISOString(),
          updatedAt:
            new Date(0).toISOString(),
          publishedAt:
            new Date(0).toISOString(),
        },
        publishedAt:
          new Date(0).toISOString(),
        reactions: 0,
        comments: 0,
      };
    },
    [result]
  );

  const communityIsLiked = communityPost
    ? isLiked(communityPost.id)
    : false;

  const displayedLikeCount = communityPost
    ? getLikeCount(communityPost.id, 0)
    : 0;

  const displayedCommentCount = communityPost
    ? getCommentCount(communityPost.id, 0)
    : 0;

  const hasComments =
    displayedCommentCount > 0;

  function handleLikePress() {
    if (
      !communityPost ||
      isLoadingLikes
    ) {
      return;
    }

    toggleLike(communityPost.id);
  }

  function openComments() {
    if (!communityPost) {
      return;
    }

    setSelectedCommentsPost(
      communityPost
    );
  }

  function closeComments() {
    setSelectedCommentsPost(null);
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
            Calculating overall rankings…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!category || !result) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader showBackButton />

        <View style={styles.messageState}>
          <Text style={styles.messageTitle}>
            Ranking unavailable
          </Text>

          <Text style={styles.messageText}>
            A category is required to calculate
            this Overall Top 3.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const pageTitle =
    result.topic === 'general'
      ? `Overall Top 3 ${result.category}`
      : `Overall Top 3 ${result.topic}`;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headingSection}>
          <Text style={styles.title}>
            {pageTitle}
          </Text>
        </View>

        {result.items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Not enough rankings yet
            </Text>

            <Text style={styles.emptyText}>
              Publish Top 3 lists in this category
              and topic to build the overall
              ranking.
            </Text>
          </View>
        ) : (
          <View style={styles.rankingCard}>
            <View style={styles.rankingContent}>
              {result.items.map(
                (entry, index) => (
                  <View
                    key={entry.item.id}
                    style={[
                      styles.rankRow,
                      index <
                        result.items.length - 1 &&
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

            <View style={styles.cardFooter}>
              <View style={styles.sourceItem}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color="#777777"
                />

                <Text style={styles.footerText}>
                  Based on {result.totalLists}{' '}
                  {result.totalLists === 1
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
                  onPress={handleLikePress}
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
                      ? `Unlike ${pageTitle}`
                      : `Like ${pageTitle}`
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
                    {displayedLikeCount}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.engagementButton,
                    pressed && styles.pressed,
                    isLoadingComments &&
                      styles.disabled,
                  ]}
                  onPress={openComments}
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
                  accessibilityLabel={`Open comments for ${pageTitle}`}>
                  <Ionicons
                    name={
                      hasComments
                        ? 'chatbubble'
                        : 'chatbubble-outline'
                    }
                    size={15}
                    color={
                      hasComments
                        ? '#222222'
                        : '#777777'
                    }
                  />

                  <Text
                    style={[
                      styles.engagementText,
                      hasComments &&
                        styles
                          .activeEngagementText,
                    ]}>
                    {displayedCommentCount}
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

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  headingSection: {
    marginBottom: 22,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: '#222222',
  },

  rankingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
    overflow: 'hidden',
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
    backgroundColor: '#EEEEEE',
    marginRight: 14,
  },

  imagePlaceholder: {
    width: 70,
    height: 105,
    borderRadius: 10,
    backgroundColor: '#EEEEEE',
    marginRight: 14,
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

  cardFooter: {
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

  pressed: {
    opacity: 0.65,
  },

  disabled: {
    opacity: 0.5,
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

  emptyState: {
    alignItems: 'center',
    paddingVertical: 42,
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
});