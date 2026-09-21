import AppText from '@/components/app-text';
import CommentsSheet from '@/components/comments-sheet';
import { MediaPreviewItemButton } from '@/components/media-preview-button';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useComments } from '@/context/comment-context';
import { useLike } from '@/context/like-context';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { getPublishedPosts } from '@/services/post-service';
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
  useState
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


function normalizeRouteValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

export default function CommunityTop3Screen() {
  const colors = useAppColors();

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

  const [hasLoadError, setHasLoadError] =
    useState(false);

  const [loadAttempt, setLoadAttempt] =
    useState(0);

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setHasLoadError(false);

      try {
const publishedPosts =
  await getPublishedPosts();

if (isMounted) {
  setAllPosts(publishedPosts);
}
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load overall Top 3:',
            error
          );
        }

        if (isMounted) {
          setAllPosts(posts);
          setHasLoadError(posts.length === 0);
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
  }, [posts, loadAttempt]);

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

  const saveCategory =
    TOP3_CATEGORIES.find(
      ({ id }) => id === result?.category
    )?.id;

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
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.loadingState}>
          <ActivityIndicator
            size="small"
            color={colors.text}
          />

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.loadingText}>
            Calculating overall rankings…
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (hasLoadError) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.messageState}>
          <AppText
            variant="stateTitle"
            style={styles.messageTitle}>
            Couldn’t load this ranking
          </AppText>

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.messageText}>
            Check your connection and try again.
          </AppText>

          <PrimaryButton
            title="Try Again"
            onPress={() =>
              setLoadAttempt((current) => current + 1)
            }
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!category || !result) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.messageState}>
          <AppText
            variant="stateTitle"
            style={styles.messageTitle}>
            Ranking unavailable
          </AppText>

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.messageText}>
            A category is required to calculate
            this Overall Top 3.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const artworkRule =
    getCategoryArtworkRule(
      result.category
    );

  const pageTitle =
    result.topic === 'general'
      ? `Overall Top 3 ${result.category}`
      : `Overall Top 3 ${result.topic}`;

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headingSection}>
          <AppText variant="rankingTitle">
            {pageTitle}
          </AppText>
        </View>

        {result.items.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <AppText variant="sectionTitle">
              Not enough rankings yet
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyText}>
              Publish Top 3 lists in this category
              and topic to build the overall
              ranking.
            </AppText>
          </View>
        ) : (
          <View
            style={[
              styles.rankingCard,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <View style={styles.rankingContent}>
              {result.items.map(
                (entry, index) => (
                  <View
                    key={entry.item.id}
                    style={[
                      styles.rankRow,
                      index <
                        result.items.length - 1 && {
                        borderBottomWidth:
                          StyleSheet.hairlineWidth,
                        borderBottomColor:
                          colors.border,
                      },
                    ]}>
                    <AppText
                      variant="rankNumber"
                      style={styles.rankNumber}>
                      {index + 1}
                    </AppText>

                    <View
                      style={[
                        styles.artworkContainer,
                        {
                          width: artworkRule.width,
                          height: artworkRule.height,
                        },
                      ]}>
                      {entry.item.imageUrl ? (
                        <Image
                          source={{
                            uri: entry.item.imageUrl,
                          }}
                          style={[
                            styles.itemImage,
                            {
                              width: artworkRule.width,
                              height: artworkRule.height,
                              backgroundColor:
                                colors.skeletonSubtle,
                            },
                          ]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.imagePlaceholder,
                            {
                              width: artworkRule.width,
                              height: artworkRule.height,
                              backgroundColor:
                                colors.skeletonSubtle,
                            },
                          ]}>
                          <AppText
                            variant="artworkInitial">
                            {entry.item.title
                              .charAt(0)
                              .toUpperCase()}
                          </AppText>
                        </View>
                      )}

                      <MediaPreviewItemButton
                        item={entry.item}
                        category={result.category}
                        saveContext={
                          saveCategory
                            ? {
                                category:
                                  saveCategory,
                              }
                            : undefined
                        }
                        style={styles.previewButton}
                        iconSize={18}
                        iconColor={colors.white}
                        offsetPlayIcon={false}
                      />
                    </View>

                    <View
                      style={styles.itemDetails}>
                      <AppText
                        variant="selectionTitle"
                        numberOfLines={2}>
                        {entry.item.title}
                      </AppText>

                      {entry.item.subtitle ? (
                        <AppText
                          variant="subtitle"
                          numberOfLines={1}
                          style={styles.itemSubtitle}>
                          {entry.item.subtitle}
                        </AppText>
                      ) : null}

                      {typeof entry.item.rating ===
                      'number' ? (
                        <AppText
                          variant="caption"
                          tone="secondary"
                          style={styles.itemRating}>
                          {entry.item.rating.toFixed(
                            1
                          )}{' '}
                          ★
                        </AppText>
                      ) : null}

                      <AppText
                        variant="metadata"
                        tone="tertiary"
                        style={styles.scoreText}>
                        {entry.score}{' '}
                        {entry.score === 1
                          ? 'point'
                          : 'points'}{' '}
                        · {entry.appearanceCount}{' '}
                        {entry.appearanceCount === 1
                          ? 'list'
                          : 'lists'}
                      </AppText>
                    </View>
                  </View>
                )
              )}
            </View>

            <View
              style={[
                styles.cardFooter,
                {
                  borderTopColor: colors.border,
                },
              ]}>
              <View style={styles.sourceItem}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={colors.tertiaryText}
                />

                <AppText
                  variant="metadata"
                  tone="tertiary"
                  style={styles.footerText}>
                  Based on {result.totalLists}{' '}
                  {result.totalLists === 1
                    ? 'published list'
                    : 'published lists'}
                </AppText>
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
                        ? colors.heart
                        : colors.tertiaryText
                    }
                  />

                  <AppText
                    variant="metadata"
                    tone={
                      communityIsLiked
                        ? 'primary'
                        : 'tertiary'
                    }
                    emphasis={
                      communityIsLiked
                        ? 'semibold'
                        : 'regular'
                    }
                    style={styles.engagementText}>
                    {displayedLikeCount}
                  </AppText>
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
                        ? colors.text
                        : colors.tertiaryText
                    }
                  />

                  <AppText
                    variant="metadata"
                    tone={
                      hasComments
                        ? 'primary'
                        : 'tertiary'
                    }
                    emphasis={
                      hasComments
                        ? 'semibold'
                        : 'regular'
                    }
                    style={styles.engagementText}>
                    {displayedCommentCount}
                  </AppText>
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
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  headingSection: {
    marginBottom: 22,
  },

  rankingCard: {
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

  rankNumber: {
    width: 30,
  },

  artworkContainer: {
    position: 'relative',
    marginRight: 14,
  },

  itemImage: {
    borderRadius: 10,
  },

  imagePlaceholder: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -18,
    marginLeft: -18,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },

  itemDetails: {
    flex: 1,
  },

  itemSubtitle: {
    marginTop: 4,
  },

  itemRating: {
    marginTop: 5,
  },

  scoreText: {
    marginTop: 7,
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
  },

  messageState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 90,
    paddingHorizontal: 24,
  },

  messageTitle: {
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 42,
    paddingHorizontal: 24,
    borderRadius: 18,
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
  },
});