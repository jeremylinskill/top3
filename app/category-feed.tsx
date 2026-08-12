import CommentsSheet from '@/components/comments-sheet';
import ScreenHeader from '@/components/screen-header';
import SegmentedControl from '@/components/segmented-control';
import Top3Card from '@/components/top3-card';
import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useAudioPreview } from '@/context/audio-preview-context';
import { useComments } from '@/context/comment-context';
import { useLike } from '@/context/like-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import {
  getCachedTrailerAvailability,
  getMovieTrailerUrl,
  getTvShowTrailerUrl,
} from '@/providers/tmdb';
import { getPublicProfilesByIds } from '@/lib/supabase/profiles';
import {
  getPublishedPosts
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

type CategoryView = 'lists' | 'overall';


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
    itemQuery?: string | string[];
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

  const itemQueryParam = Array.isArray(
    params.itemQuery
  )
    ? params.itemQuery[0]
    : params.itemQuery;

  const normalizedTopic =
    normalizeValue(topicParam) || 'general';

  const normalizedItemQuery =
    normalizeValue(itemQueryParam);

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

  const [profilesByUserId, setProfilesByUserId] =
  useState<Record<string, UserProfile>>({});

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
        const publishedPosts =
  await getPublishedPosts();

  const authorProfiles =
  await getPublicProfilesByIds(
    publishedPosts.map((post) => post.authorId)
  );

const nextProfilesByUserId =
  Object.fromEntries(
    authorProfiles.map((authorProfile) => [
      authorProfile.id,
      authorProfile,
    ])
  );

if (isMounted) {
  setAllPosts(publishedPosts);
  setProfilesByUserId(nextProfilesByUserId);
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

        const topicMatches =
          normalizedTopic === 'general'
            ? postTopic === 'general'
            : postTopic === normalizedTopic;

        if (!topicMatches) {
          return false;
        }

        if (!normalizedItemQuery) {
          return true;
        }

        return post.collection.items.some(
          (item) => {
            if (!item) {
              return false;
            }

            const searchableItem =
              normalizeValue(
                `${item.title} ${
                  item.subtitle ?? ''
                }`
              );

            return searchableItem.includes(
              normalizedItemQuery
            );
          }
        );
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
    normalizedItemQuery,
  ]);

  const overallResult = useMemo<
    CommunityTop3Result | null
  >(() => {
    if (!categoryId) {
      return null;
    }

    return calculateCommunityTop3(
      filteredPosts,
      {
        category: categoryId,
        topic: normalizedTopic,
      }
    );
  }, [
    filteredPosts,
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

      const queryKey = normalizedItemQuery
        ? `-${normalizedItemQuery.replace(
            /[^a-z0-9]+/g,
            '-'
          )}`
        : '';

      const postId =
        `community-${normalizedCategory}-` +
        `${normalizedTopic}${queryKey}`;

      const items: Post['collection']['items'] =
        [
          overallResult.items[0]?.item ?? null,
          overallResult.items[1]?.item ?? null,
          overallResult.items[2]?.item ?? null,
        ];

      const title =
        normalizedTopic === 'general'
          ? category?.name ??
            overallResult.category
          : `${
              category?.name ??
              overallResult.category
            } • ${formatTopicLabel(
              topicParam ?? normalizedTopic
            )}`;

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
      normalizedItemQuery,
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

  return (
    profilesByUserId[authorId] ?? null
  );
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
    router.push({
      pathname: '/published-top3',
      params: {
        postId: post.id,
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


  function getTrailerItemId(
    itemId?: string
  ): number | undefined {
    if (!itemId || !category) {
      return undefined;
    }

    const itemIdMatch =
      category.id === 'movies'
        ? /^movie-(\d+)$/.exec(itemId)
        : category.id === 'tv'
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
      !category ||
      !overallResult ||
      (
        category.id !== 'movies' &&
        category.id !== 'tv'
      )
    ) {
      return;
    }

    const trailerCategoryId:
      'movies' | 'tv' = category.id;

    const trailerOverallResult =
      overallResult;

    let isMounted = true;

    async function loadTrailerAvailability() {
      const updates: Record<
        string,
        boolean | undefined
      > = {};

      await Promise.all(
        trailerOverallResult.items.map(
          async (entry) => {
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

            if (
              cachedAvailability !== undefined
            ) {
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
          }
        )
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
  }, [
    category?.id,
    overallResult,
  ]);


  async function playTrailer(
    item: CommunityTop3Result['items'][number]['item']
  ) {
    if (!category) {
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
        category.id === 'movies'
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
    ? `${category.name} • ${topicLabel}`
    : category.name;

  const artworkRule =
    getCategoryArtworkRule(
      category.id
    );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <View style={styles.segmentedContainer}>
        <SegmentedControl<CategoryView>
          value={activeView}
          options={[
            {
              value: 'lists',
              label: 'Lists',
              accessibilityLabel:
                'Show published lists',
            },
            {
              value: 'overall',
              label: 'Overall',
              accessibilityLabel:
                'Show overall ranking',
            },
          ]}
          onChange={setActiveView}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {normalizedItemQuery ? (
          <View style={styles.filterNotice}>
            <Ionicons
              name="search-outline"
              size={16}
              color="#777777"
            />

            <Text style={styles.filterNoticeText}>
              Showing lists containing “
              {itemQueryParam?.trim()}”
            </Text>
          </View>
        ) : null}

        {activeView === 'lists' ? (
          filteredPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {normalizedItemQuery
                  ? 'No matching Top 3s'
                  : 'Nothing published yet'}
              </Text>

              <Text style={styles.emptyText}>
                {normalizedItemQuery
                  ? `No published lists here contain “${
                      itemQueryParam?.trim() ?? ''
                    }”.`
                  : 'Published Top 3 lists in this category and topic will appear here.'}
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

                const isCurrentUserPost =
                  post.authorId === profile.id;

                return (
                  <Top3Card
                    key={post.id}
                    post={post}
                    author={author}
                    showAuthor
                    highlightQuery={itemQueryParam}
                    onAuthorPress={() =>
                      openAuthorProfile(
                        post.authorId
                      )
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
                        overallResult.items.length - 1 &&
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
                    </View>

                    <View
                      style={styles.itemDetails}>
                      <Text
                        style={styles.itemTitle}
                        numberOfLines={2}
                        ellipsizeMode="tail">
                        {entry.item.title}
                      </Text>

                      {entry.item.subtitle ? (
                        <Text
                          style={
                            styles.itemSubtitle
                          }
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {entry.item.subtitle}
                        </Text>
                      ) : null}

                      {typeof entry.item.rating ===
                      'number' ? (
                        <View
                          style={styles.ratingRow}>
                          <Text
                            style={styles.ratingText}>
                            {entry.item.rating.toFixed(1)}
                          </Text>

                          <Ionicons
                            name="star"
                            size={13}
                            color="#555555"
                          />
                        </View>
                      ) : null}

                      <Text
                        style={styles.scoreText}
                        numberOfLines={1}>
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
                          size={17}
                          color="#555555"
                          style={
                            loadingTrailerItemId ===
                            entry.item.id
                              ? undefined
                              : styles.previewPlayIcon
                          }
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
                          size={17}
                          color="#555555"
                          style={
                            activePreviewItemId ===
                              entry.item.id &&
                            isPreviewPlaying
                              ? undefined
                              : styles.previewPlayIcon
                          }
                        />
                      </Pressable>
                    ) : null}
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

  segmentedContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#FAFAFA',
  },


  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },

  filterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 14,
  },

  filterNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#777777',
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
    paddingBottom: 14,
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },

  rankDivider: {
    marginBottom: 8,
  },

  rankNumber: {
    width: 28,
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },

  artworkContainer: {
    position: 'relative',
    marginRight: 13,
  },

  itemImage: {
    borderRadius: 9,
    backgroundColor: '#EEEEEE',
  },

  imagePlaceholder: {
    borderRadius: 9,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    marginLeft: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  previewPlayIcon: {
    transform: [{ translateX: 1 }],
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
    minWidth: 0,
  },

  itemTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
    color: '#222222',
  },

  itemSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    color: '#888888',
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  ratingText: {
    marginRight: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },

  scoreText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
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
    opacity: 0.68,
  },

  disabled: {
    opacity: 0.5,
  },
});