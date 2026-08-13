import CommentsSheet from '@/components/comments-sheet';
import ScreenHeader from '@/components/screen-header';
import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import { useAudioPreview } from '@/context/audio-preview-context';
import { useComments } from '@/context/comment-context';
import { useLike } from '@/context/like-context';
import { useTop3 } from '@/context/top3-context';
import {
  getCachedTrailerAvailability,
  getMovieTrailerUrl,
  getTvShowTrailerUrl,
} from '@/providers/movies-and-tv';
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
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';


function getYouTubeEmbedUrl(
  trailerUrl: string
): string | undefined {
  const videoIdMatch =
    /[?&]v=([^&]+)/.exec(trailerUrl);

  const encodedVideoId =
    videoIdMatch?.[1];

  if (!encodedVideoId) {
    return undefined;
  }

  let videoId = encodedVideoId;

  try {
    videoId =
      decodeURIComponent(encodedVideoId);
  } catch {
    // Keep the encoded ID if decoding fails.
  }

  return (
    `https://www.youtube.com/embed/${videoId}` +
    '?autoplay=1&playsinline=1&rel=0'
  );
}


function getYouTubeEmbedHtml(
  embedUrl: string
): string {
  return `
<!doctype html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000000;
      }

      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: #000000;
      }
    </style>
  </head>
  <body>
    <iframe
      src="${embedUrl}"
      title="Trailer"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  </body>
</html>
  `.trim();
}

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

  const {
    activePreviewItemId,
    isPreviewPlaying,
    togglePreview,
    stopPreview,
  } = useAudioPreview();

  const [
    loadingTrailerItemId,
    setLoadingTrailerItemId,
  ] = useState<string | null>(null);
  const [
    trailerAvailability,
    setTrailerAvailability,
  ] = useState<Record<string, boolean | undefined>>({});

  const [
    activeTrailerUrl,
    setActiveTrailerUrl,
  ] = useState<string | null>(null);

  const [
    activeTrailerTitle,
    setActiveTrailerTitle,
  ] = useState<string | null>(null);

  const [
    isTrailerLoaded,
    setIsTrailerLoaded,
  ] = useState(false);

  const trailerCloseOpacity =
    useRef(new Animated.Value(0)).current;

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
const publishedPosts =
  await getPublishedPosts();

if (isMounted) {
  setAllPosts(publishedPosts);
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


  function getTrailerItemId(
    itemId?: string
  ): number | undefined {
    if (!itemId || !result) {
      return undefined;
    }

    const itemIdMatch =
      result.category === 'movies'
        ? /^movie-(\d+)$/.exec(itemId)
        : result.category === 'tv'
          ? /^tv-(\d+)$/.exec(itemId)
          : null;

    if (!itemIdMatch) {
      return undefined;
    }

    const numericItemId =
      Number(itemIdMatch[1]);

    return Number.isFinite(numericItemId)
      ? numericItemId
      : undefined;
  }



  useEffect(() => {
    if (
      !result ||
      (
        result.category !== 'movies' &&
        result.category !== 'tv'
      )
    ) {
      return;
    }

    const trailerCategoryId:
      'movies' | 'tv' =
      result.category;

    const trailerResult = result;

    let isMounted = true;

    async function loadTrailerAvailability() {
      const updates: Record<
        string,
        boolean | undefined
      > = {};

      await Promise.all(
        trailerResult.items.map(async (entry) => {
          const item = entry.item;

          const itemId =
            getTrailerItemId(item.id);

          if (itemId === undefined) {
            updates[item.id] = false;
            return;
          }

          const cachedAvailability =
            getCachedTrailerAvailability(
              trailerCategoryId,
              itemId
            );

          if (cachedAvailability !== undefined) {
            updates[item.id] =
              cachedAvailability;
            return;
          }

          try {
            const trailerUrl =
              trailerCategoryId === 'movies'
                ? await getMovieTrailerUrl(
                    itemId
                  )
                : await getTvShowTrailerUrl(
                    itemId
                  );

            updates[item.id] =
              Boolean(trailerUrl);
          } catch (error) {
            if (__DEV__) {
              console.warn(
                `Failed to check trailer availability for ${item.title}:`,
                error
              );
            }

            updates[item.id] =
              undefined;
          }
        })
      );

      if (isMounted) {
        setTrailerAvailability(
          (current) => ({
            ...current,
            ...updates,
          })
        );
      }
    }

    void loadTrailerAvailability();

    return () => {
      isMounted = false;
    };
  }, [result]);


  async function playTrailer(
    item: CommunityTop3Result['items'][number]['item']
  ) {
    if (!result) {
      return;
    }

    const itemId =
      getTrailerItemId(item.id);

    if (itemId === undefined) {
      return;
    }

    setLoadingTrailerItemId(item.id);

    try {
      const trailerUrl =
        result.category === 'movies'
          ? await getMovieTrailerUrl(itemId)
          : await getTvShowTrailerUrl(itemId);

      if (!trailerUrl) {
        setTrailerAvailability(
          (current) => ({
            ...current,
            [item.id]: false,
          })
        );
        return;
      }

      setTrailerAvailability(
        (current) => ({
          ...current,
          [item.id]: true,
        })
      );

      const embedUrl =
        getYouTubeEmbedUrl(trailerUrl);

      if (!embedUrl) {
        return;
      }

      stopPreview();
      setIsTrailerLoaded(false);
      trailerCloseOpacity.setValue(0);
      setActiveTrailerTitle(item.title);
      setActiveTrailerUrl(embedUrl);
    } catch (error) {
      if (__DEV__) {
        console.warn(
          `Failed to open trailer for ${item.title}:`,
          error
        );
      }
    } finally {
      setLoadingTrailerItemId((currentItemId) =>
        currentItemId === item.id ? null : currentItemId
      );
    }
  }


  function handleTrailerLoadEnd() {
    setIsTrailerLoaded(true);

    Animated.timing(
      trailerCloseOpacity,
      {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }
    ).start();
  }


  function closeTrailer() {
    setIsTrailerLoaded(false);
    trailerCloseOpacity.setValue(0);
    setActiveTrailerUrl(null);
    setActiveTrailerTitle(null);
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
                            },
                          ]}>
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

                      {trailerAvailability[
                        entry.item.id
                      ] === true ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.previewButton,
                            pressed &&
                              styles.previewButtonPressed,
                          ]}
                          onPress={(event) => {
                            event.stopPropagation();
                            void playTrailer(
                              entry.item
                            );
                          }}
                          disabled={
                            loadingTrailerItemId ===
                            entry.item.id
                          }
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={
                            `Play trailer for ${entry.item.title}`
                          }>
                          <Ionicons
                            name={
                              loadingTrailerItemId ===
                              entry.item.id
                                ? 'ellipsis-horizontal'
                                : 'play'
                            }
                            size={18}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      ) : entry.item.previewUrl ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.previewButton,
                            pressed &&
                              styles.previewButtonPressed,
                          ]}
                          onPress={(event) => {
                            event.stopPropagation();
                            void togglePreview(
                              entry.item
                            );
                          }}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={
                            activePreviewItemId ===
                              entry.item.id &&
                            isPreviewPlaying
                              ? `Pause preview of ${entry.item.title}`
                              : `Play preview of ${entry.item.title}`
                          }>
                          <Ionicons
                            name={
                              activePreviewItemId ===
                                entry.item.id &&
                              isPreviewPlaying
                                ? 'pause'
                                : 'play'
                            }
                            size={18}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      ) : null}
                    </View>

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

      <Modal
        visible={Boolean(activeTrailerUrl)}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closeTrailer}>
        <SafeAreaView
          style={styles.trailerModal}
          edges={['top', 'right', 'bottom', 'left']}>
          <View style={styles.trailerModalContent}>
            {activeTrailerUrl ? (
              <View style={styles.trailerPlayer}>
                {isTrailerLoaded ? (
                  <Animated.View
                    style={[
                      styles.trailerCloseButtonWrapper,
                      {
                        opacity:
                          trailerCloseOpacity,
                      },
                    ]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.trailerCloseButton,
                        pressed &&
                          styles.trailerCloseButtonPressed,
                      ]}
                      onPress={closeTrailer}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={
                        activeTrailerTitle
                          ? `Close trailer for ${activeTrailerTitle}`
                          : 'Close trailer'
                      }>
                      <Ionicons
                        name="close"
                        size={20}
                        color="rgba(255, 255, 255, 0.88)"
                      />
                    </Pressable>
                  </Animated.View>
                ) : null}

                <WebView
                  source={{
                    html:
                      getYouTubeEmbedHtml(
                        activeTrailerUrl
                      ),
                    baseUrl:
                      'https://com.jeremylinskillsteam.top3',
                  }}
                  style={styles.trailerWebView}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsFullscreenVideo
                  onLoadEnd={handleTrailerLoadEnd}
                />
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
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

  artworkContainer: {
    position: 'relative',
    marginRight: 14,
  },

  itemImage: {
    borderRadius: 10,
    backgroundColor: '#EEEEEE',
  },

  imagePlaceholder: {
    borderRadius: 10,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 36,
    height: 36,
    marginTop: -18,
    marginLeft: -18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },

  previewButtonPressed: {
    opacity: 0.75,
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

  trailerModal: {
    flex: 1,
    backgroundColor: '#000000',
  },

  trailerModalContent: {
    flex: 1,
    justifyContent: 'center',
  },

  trailerPlayer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },

  trailerWebView: {
    flex: 1,
    backgroundColor: '#000000',
  },

  trailerCloseButtonWrapper: {
    position: 'absolute',
    top: -52,
    right: 18,
    zIndex: 2,
  },

  trailerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },

  trailerCloseButtonPressed: {
    opacity: 0.7,
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