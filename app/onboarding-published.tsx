import PrimaryButton from '@/components/primary-button';
import Top3Card from '@/components/top3-card';
import { getCategoryArtworkRule } from '@/constants/category-artwork-rules';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { TYPOGRAPHY } from '@/constants/typography';
import { useAudioPreview } from '@/context/audio-preview-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useTrailerPreview } from '@/context/trailer-preview-context';
import { useAuth } from '@/hooks/use-auth';
import { getPublishedPostsByUser } from '@/lib/supabase/collections';
import {
  getCachedTrailerAvailability,
  getMovieTrailerUrl,
  getTvShowTrailerUrl,
} from '@/providers/movies-and-tv';
import { getPopularSuggestionsByCategory } from '@/providers/search';
import { Post } from '@/types/post';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


type OnboardingView = 'lists' | 'overall';


const DEMO_PUBLISHED_LIST_COUNT = 103;


function shuffleItems(
  items: Top3Item[]
): Top3Item[] {
  return [...items].sort(
    () => Math.random() - 0.5
  );
}


export default function OnboardingPublishedScreen() {
  const { height: windowHeight } =
    useWindowDimensions();

  const isCompactHeight =
    windowHeight <= 920;

  const { currentList, posts } = useTop3();
  const { profile } = useProfile();
  const { user } = useAuth();

  const [
    fetchedPublishedPost,
    setFetchedPublishedPost,
  ] = useState<Post | null>(null);

  const [
    isLoadingPublishedPost,
    setIsLoadingPublishedPost,
  ] = useState(false);

  const [
    hasPublishedPostLoadError,
    setHasPublishedPostLoadError,
  ] = useState(false);

  const [
    publishedPostLoadAttempt,
    setPublishedPostLoadAttempt,
  ] = useState(0);

  const [
    activeView,
    setActiveView,
  ] = useState<OnboardingView>('lists');

  const [
    segmentedWidth,
    setSegmentedWidth,
  ] = useState(0);

  const [
    overallItems,
    setOverallItems,
  ] = useState<Top3Item[]>([]);

  const [
    isLoadingOverall,
    setIsLoadingOverall,
  ] = useState(false);


  const {
    activePreviewItemId,
    isPreviewPlaying,
    togglePreview,
  } = useAudioPreview();

  const [
    loadingTrailerItemId,
    setLoadingTrailerItemId,
  ] = useState<string | null>(null);

  const [
    trailerAvailability,
    setTrailerAvailability,
  ] = useState<Record<string, boolean | undefined>>({});

  const {
    activeTrailerItem,
    openTrailer,
    closeTrailer,
  } = useTrailerPreview();


  const titleOpacity =
    useRef(new Animated.Value(0)).current;
  const subtitleOpacity =
    useRef(new Animated.Value(0)).current;
  const listsTextOpacity =
    useRef(new Animated.Value(1)).current;
  const overallTextOpacity =
    useRef(new Animated.Value(0)).current;
  const listsCardOpacity =
    useRef(new Animated.Value(0)).current;
  const overallCardOpacity =
    useRef(new Animated.Value(0)).current;
  const cardScale =
    useRef(new Animated.Value(0.975)).current;


  const toggleProgress =
    useRef(new Animated.Value(0)).current;

  const isViewTransitioning =
    useRef(false);


  const localPublishedPost = useMemo<Post | null>(
    () => {
      if (!currentList) {
        return null;
      }


      const existingPost = posts.find(
        (post) =>
          post.collection.id === currentList.id
      );


      if (existingPost) {
        return existingPost;
      }


      const publishedAt =
        currentList.publishedAt ??
        new Date().toISOString();


      return {
        id: `post-${currentList.id}`,
        authorId: profile.id,
        collection: {
          ...currentList,
          publishedAt,
        },
        publishedAt,
        reactions: 0,
        comments: 0,
      };
    },
    [
      currentList,
      posts,
      profile.id,
    ]
  );


  const publishedPost =
    localPublishedPost ??
    fetchedPublishedPost;


  const category = useMemo(
    () =>
      TOP3_CATEGORIES.find(
        (candidate) =>
          candidate.id ===
          publishedPost?.collection.category
      ),
    [publishedPost]
  );


  const artworkRule =
    getCategoryArtworkRule(
      publishedPost?.collection.category ?? ''
    );


  function getTrailerItemId(
    itemId?: string
  ): number | undefined {
    if (!itemId || !publishedPost) {
      return undefined;
    }

    const itemIdMatch =
      publishedPost.collection.category === 'movies'
        ? /^movie-(\d+)$/.exec(itemId)
        : publishedPost.collection.category === 'tv'
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


  async function playTrailer(
    item: Top3Item
  ) {
    const trailerCategory =
      publishedPost?.collection.category === 'movies' ||
      publishedPost?.collection.category === 'tv' ||
      publishedPost?.collection.category === 'games'
        ? publishedPost.collection.category
        : null;

    if (!trailerCategory) {
      return;
    }

    if (
      trailerCategory === 'games'
        ? !item.trailerVideoId
        : getTrailerItemId(item.id) === undefined
    ) {
      return;
    }

    setLoadingTrailerItemId(item.id);

    try {
      const didOpen = await openTrailer(
        item,
        trailerCategory
      );

      setTrailerAvailability(
        (current) => ({
          ...current,
          [item.id]: didOpen,
        })
      );
    } finally {
      setLoadingTrailerItemId(
        (currentItemId) =>
          currentItemId === item.id
            ? null
            : currentItemId
      );
    }
  }


  useEffect(() => {
    if (
      localPublishedPost ||
      !user
    ) {
      return;
    }


    let isCancelled = false;

    const authenticatedUserId = user.id;


    async function loadLatestPublishedPost() {
      setIsLoadingPublishedPost(true);
      setHasPublishedPostLoadError(false);


      try {
        const publishedPosts =
          await getPublishedPostsByUser(
            authenticatedUserId
          );


        if (isCancelled) {
          return;
        }


        setFetchedPublishedPost(
          publishedPosts[0] ?? null
        );
        setHasPublishedPostLoadError(false);
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load published onboarding collection:',
            error
          );
        }


        if (!isCancelled) {
          setFetchedPublishedPost(null);
          setHasPublishedPostLoadError(true);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPublishedPost(false);
        }
      }
    }


    void loadLatestPublishedPost();


    return () => {
      isCancelled = true;
    };
  }, [
    localPublishedPost,
    publishedPostLoadAttempt,
    user,
  ]);


  useEffect(() => {
    if (!publishedPost) {
      return;
    }


    titleOpacity.setValue(0);
    subtitleOpacity.setValue(0);
    listsCardOpacity.setValue(0);
    overallCardOpacity.setValue(0);
    cardScale.setValue(0.975);


    Animated.sequence([
      Animated.delay(140),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(70),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(listsCardOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    cardScale,
    listsCardOpacity,
    overallCardOpacity,
    publishedPost,
    subtitleOpacity,
    titleOpacity,
  ]);


  useEffect(() => {
    if (!publishedPost) {
      return;
    }


    const activePublishedPost =
      publishedPost;


    const userItems =
      activePublishedPost.collection.items.filter(
        (item): item is Top3Item =>
          item !== null
      );

    const userSecondItem =
      userItems[1];

    if (!userSecondItem) {
      setOverallItems(userItems.slice(0, 3));
      return;
    }


    const controller =
      new AbortController();

    let isCancelled = false;


    async function loadOverallDemoItems() {
      setIsLoadingOverall(true);


      try {
        const suggestions =
          await getPopularSuggestionsByCategory(
            activePublishedPost.collection.category,
            activePublishedPost.collection.topic,
            12,
            controller.signal
          );


        if (isCancelled) {
          return;
        }


        const userItemIds =
          new Set(
            userItems.map(
              (item) => item.id
            )
          );

        const eligibleSuggestions =
          suggestions.filter(
            (item) =>
              !userItemIds.has(item.id)
          );

        const randomSuggestions =
          shuffleItems(
            eligibleSuggestions
          ).slice(0, 2);

        const fallbackItems =
          userItems.filter(
            (item) =>
              item.id !==
              userSecondItem.id
          );

        const nextItems = [
          userSecondItem,
          ...randomSuggestions,
          ...fallbackItems,
        ];

        const uniqueItems =
          nextItems.filter(
            (item, index, allItems) =>
              allItems.findIndex(
                (candidate) =>
                  candidate.id === item.id
              ) === index
          );

        setOverallItems(
          uniqueItems.slice(0, 3)
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'AbortError'
        ) {
          return;
        }


        if (__DEV__) {
          console.log(
            'Failed to load onboarding Overall Top 3 suggestions:',
            error
          );
        }


        if (!isCancelled) {
          const fallbackItems = [
            userSecondItem,
            ...userItems.filter(
              (item) =>
                item.id !==
                userSecondItem.id
            ),
          ];

          setOverallItems(
            fallbackItems.slice(0, 3)
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingOverall(false);
        }
      }
    }


    void loadOverallDemoItems();


    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [publishedPost]);


  useEffect(() => {
    if (!publishedPost) {
      return;
    }

    const categoryId =
      publishedPost.collection.category;

    if (categoryId === 'games') {
      const updates = Object.fromEntries(
        overallItems.map((item) => [
          item.id,
          Boolean(item.trailerVideoId),
        ])
      );

      setTrailerAvailability((current) => ({
        ...current,
        ...updates,
      }));
      return;
    }

    if (
      categoryId !== 'movies' &&
      categoryId !== 'tv'
    ) {
      return;
    }

    const trailerCategoryId:
      'movies' | 'tv' = categoryId;

    let isMounted = true;

    async function loadTrailerAvailability() {
      const updates: Record<
        string,
        boolean | undefined
      > = {};

      await Promise.all(
        overallItems.map(
          async (item) => {
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
              cachedAvailability !==
              undefined
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
            } catch {
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
    overallItems,
    publishedPost,
  ]);


  function changeView(
    nextView: OnboardingView
  ) {
    if (
      nextView === activeView ||
      isViewTransitioning.current
    ) {
      return;
    }


    isViewTransitioning.current = true;

    const nextToggleValue =
      nextView === 'overall' ? 1 : 0;

    const nextListsOpacity =
      nextView === 'lists' ? 1 : 0;

    const nextOverallOpacity =
      nextView === 'overall' ? 1 : 0;


    Animated.parallel([
      Animated.timing(toggleProgress, {
        toValue: nextToggleValue,
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(listsTextOpacity, {
        toValue: nextListsOpacity,
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overallTextOpacity, {
        toValue: nextOverallOpacity,
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(listsCardOpacity, {
        toValue: nextListsOpacity,
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overallCardOpacity, {
        toValue: nextOverallOpacity,
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(cardScale, {
          toValue: 0.99,
          duration: 340,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setActiveView(nextView);
      isViewTransitioning.current = false;
    });
  }


  function retryPublishedPostLoad() {
    setHasPublishedPostLoadError(false);
    setPublishedPostLoadAttempt(
      (currentAttempt) =>
        currentAttempt + 1
    );
  }


  function continueOnboarding() {
    if (activeView === 'lists') {
      changeView('overall');
      return;
    }


    router.replace(
      '/onboarding-taste-match'
    );
  }


  if (
    !publishedPost &&
    isLoadingPublishedPost
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContent}>
          <ActivityIndicator
            size="large"
            color="#222222"
          />
        </View>
      </SafeAreaView>
    );
  }


  if (
    !publishedPost &&
    hasPublishedPostLoadError
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContent}>
          <Text style={styles.title}>
            Couldn&apos;t load your Top 3
          </Text>

          <Text style={styles.loadErrorText}>
            Check your connection and try again.
          </Text>

          <PrimaryButton
            title="Try Again"
            onPress={retryPublishedPostLoad}
            style={styles.loadErrorAction}
          />
        </View>
      </SafeAreaView>
    );
  }


  if (!publishedPost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContent}>
          <Text style={styles.title}>
            Your taste is taking shape.
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  const overallTitle =
    publishedPost.collection.title.replace(
      /^Top 3\s+/i,
      ''
    );


  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.content,
          isCompactHeight &&
            styles.compactContent,
        ]}>
        <View
          style={[
            styles.headerBlock,
            isCompactHeight &&
              styles.compactHeaderBlock,
          ]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.headerLayer,
              {
                opacity:
                  Animated.multiply(
                    titleOpacity,
                    listsTextOpacity
                  ),
              },
            ]}>
            <Text style={styles.title}>
              Your taste is taking shape.
            </Text>

            <Text style={styles.subtitle}>
              Every list you share helps build a picture of what you love.
            </Text>
          </Animated.View>


          <Animated.View
            pointerEvents="none"
            style={[
              styles.headerLayer,
              styles.overallHeaderLayer,
              {
                opacity:
                  Animated.multiply(
                    titleOpacity,
                    overallTextOpacity
                  ),
              },
            ]}>
            <Text style={styles.title}>
              See what rises to the top.
            </Text>

            <Text style={styles.subtitle}>
              Every Top 3 helps shape the community rankings.
            </Text>
          </Animated.View>
        </View>


        <View
          style={[
            styles.segmentedContainer,
            isCompactHeight &&
              styles.compactSegmentedContainer,
          ]}
          onLayout={(event) => {
            setSegmentedWidth(
              event.nativeEvent.layout.width
            );
          }}>
          {segmentedWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.segmentedIndicator,
                {
                  width:
                    (segmentedWidth - 8) / 2,
                  transform: [
                    {
                      translateX:
                        toggleProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            0,
                            (segmentedWidth - 8) /
                              2,
                          ],
                        }),
                    },
                  ],
                },
              ]}
            />
          ) : null}


          <Pressable
            style={styles.segment}
            onPress={() =>
              changeView('lists')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected:
                activeView === 'lists',
            }}
            accessibilityLabel="Show published list">
            <Animated.Text
              style={[
                styles.segmentLabel,
                {
                  color:
                    toggleProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        '#222222',
                        '#777777',
                      ],
                    }),
                  opacity:
                    toggleProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.92],
                    }),
                },
              ]}>
              Lists
            </Animated.Text>
          </Pressable>


          <Pressable
            style={styles.segment}
            onPress={() =>
              changeView('overall')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected:
                activeView === 'overall',
            }}
            accessibilityLabel="Show overall ranking">
            <View style={styles.segmentLabelStack}>
              <Text style={styles.segmentLabel}>
                Overall
              </Text>

              <Animated.Text
                pointerEvents="none"
                style={[
                  styles.segmentActiveLabelOverlay,
                  {
                    opacity:
                      toggleProgress,
                  },
                ]}>
                Overall
              </Animated.Text>
            </View>
          </Pressable>
        </View>


        <Animated.View
          style={[
            styles.cardContainer,
            isCompactHeight &&
              styles.compactCardContainer,
            {
              transform: [
                {
                  scale: cardScale,
                },
              ],
            },
          ]}>
          <Animated.View
            pointerEvents={
              activeView === 'lists'
                ? 'auto'
                : 'none'
            }
            style={[
              styles.cardLayer,
              {
                opacity:
                  listsCardOpacity,
              },
            ]}>
            <Top3Card
              post={publishedPost}
              showAuthor={false}
            />
          </Animated.View>


          <Animated.View
            pointerEvents={
              activeView === 'overall'
                ? 'auto'
                : 'none'
            }
            style={[
              styles.cardLayer,
              styles.overallCardLayer,
              {
                opacity:
                  overallCardOpacity,
              },
            ]}>
            <View
              style={[
                styles.overallCard,
                isCompactHeight &&
                  styles.compactOverallCard,
              ]}>
              <View style={styles.titleRow}>
                <Text style={styles.categoryIcon}>
                  {category?.icon ?? '⭐'}
                </Text>

                <Text style={styles.cardTitle}>
                  {overallTitle}
                </Text>
              </View>


              <View style={styles.ranking}>
                {overallItems.map(
                  (item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.rankRow,
                        styles.standardRankRow,
                        index ===
                          overallItems.length - 1 &&
                          styles.lastRankRow,
                      ]}>
                      <Text
                        style={styles.rankNumber}>
                        {index + 1}
                      </Text>


                      <View
                        style={[
                          styles.artworkContainer,
                          {
                            width:
                              artworkRule.width,
                            height:
                              artworkRule.height,
                          },
                        ]}>
                        {item.imageUrl ? (
                          <Image
                            source={{
                              uri: item.imageUrl,
                            }}
                            style={[
                              styles.itemImage,
                              {
                                width:
                                  artworkRule.width,
                                height:
                                  artworkRule.height,
                              },
                            ]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.imagePlaceholder,
                              {
                                width:
                                  artworkRule.width,
                                height:
                                  artworkRule.height,
                              },
                            ]}>
                            <Ionicons
                              name="image-outline"
                              size={24}
                              color="#999999"
                            />
                          </View>
                        )}
                      </View>


                      <View
                        style={styles.itemDetails}>
                        <Text
                          style={styles.itemTitle}
                          numberOfLines={2}
                          ellipsizeMode="tail">
                          {item.title}
                        </Text>

                        {item.subtitle ? (
                          <Text
                            style={
                              styles.itemSubtitle
                            }
                            numberOfLines={1}
                            ellipsizeMode="tail">
                            {item.subtitle}
                          </Text>
                        ) : null}

                        {typeof item.rating ===
                        'number' ? (
                          <View
                            style={
                              styles.ratingRow
                            }>
                            <Text
                              style={
                                styles.ratingText
                              }>
                              {item.rating.toFixed(
                                1
                              )}
                            </Text>

                            <Ionicons
                              name="star"
                              size={13}
                              color="#555555"
                            />
                          </View>
                        ) : null}
                      </View>


                      {trailerAvailability[
                        item.id
                      ] === true ? (
                        <Pressable
                          style={({
                            pressed,
                          }) => [
                            styles.previewButton,
                            pressed &&
                              styles.previewButtonPressed,
                          ]}
                          onPress={() => {
                            if (
                              activeTrailerItem?.id ===
                              item.id
                            ) {
                              closeTrailer();
                              return;
                            }

                            void playTrailer(
                              item
                            );
                          }}
                          disabled={
                            loadingTrailerItemId ===
                            item.id
                          }
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={
                            activeTrailerItem?.id ===
                            item.id
                              ? `Close trailer for ${item.title}`
                              : `Play trailer for ${item.title}`
                          }>
                          <Ionicons
                            name={
                              activeTrailerItem?.id ===
                              item.id
                                ? 'close'
                                : loadingTrailerItemId ===
                                    item.id
                                  ? 'ellipsis-horizontal'
                                  : 'play'
                            }
                            size={17}
                            color="#555555"
                            style={
                              activeTrailerItem?.id ===
                                item.id ||
                              loadingTrailerItemId ===
                                item.id
                                ? undefined
                                : styles.previewPlayIcon
                            }
                          />
                        </Pressable>
                      ) : item.previewUrl ? (
                        <Pressable
                          style={({
                            pressed,
                          }) => [
                            styles.previewButton,
                            pressed &&
                              styles.previewButtonPressed,
                          ]}
                          onPress={() => {
                            void togglePreview(
                              item
                            );
                          }}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={
                            activePreviewItemId ===
                              item.id &&
                            isPreviewPlaying
                              ? `Pause preview of ${item.title}`
                              : `Play preview of ${item.title}`
                          }>
                          <Ionicons
                            name={
                              activePreviewItemId ===
                                item.id &&
                              isPreviewPlaying
                                ? 'pause'
                                : 'play'
                            }
                            size={17}
                            color="#555555"
                            style={
                              activePreviewItemId ===
                                item.id &&
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


              <View style={styles.footer}>
                <View style={styles.footerItem}>
                  <Ionicons
                    name="people-outline"
                    size={15}
                    color="#888888"
                  />

                  <Text style={styles.footerText}>
                    Based on{' '}
                    {DEMO_PUBLISHED_LIST_COUNT}{' '}
                    published lists
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>


      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Continue"
          onPress={continueOnboarding}
        />
      </View>


    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },


  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 20,
  },


  compactContent: {
    paddingTop: 42,
    paddingBottom: 12,
  },


  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },


  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },



  headerBlock: {
    position: 'relative',
    minHeight: 104,
  },


  compactHeaderBlock: {
    minHeight: 92,
  },


  headerLayer: {
    width: '100%',
  },


  overallHeaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },


  title: {
    ...TYPOGRAPHY.pageTitle,
    textAlign: 'center',
  },


  subtitle: {
    marginTop: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    lineHeight: 24,
    color: '#777777',
    textAlign: 'center',
  },


  segmentedContainer: {
    position: 'relative',
    flexDirection: 'row',
    marginTop: 20,
    padding: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 12,
  },


  compactSegmentedContainer: {
    marginTop: 10,
  },


  segmentedIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },


  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    zIndex: 1,
  },


  segmentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#777777',
  },


  segmentLabelStack: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },


  segmentActiveLabelOverlay: {
    position: 'absolute',
    color: '#222222',
    fontSize: 15,
    fontWeight: '700',
  },


  cardContainer: {
    position: 'relative',
    width: '100%',
    marginTop: 18,
  },


  compactCardContainer: {
    marginTop: 10,
  },


  cardLayer: {
    width: '100%',
  },


  overallCardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },


  overallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 18,
  },


  compactOverallCard: {
    padding: 18,
  },


  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },



  categoryIcon: {
    flexShrink: 0,
    marginRight: 9,
    fontSize: 22,
  },


  cardTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#222222',
  },


  ranking: {},


  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 15,
  },



  lastRankRow: {
    marginBottom: 0,
  },


  standardRankRow: {
    marginHorizontal: -10,
    paddingHorizontal: 10,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
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
    transform: [
      {
        translateX: 1,
      },
    ],
  },


  previewButtonPressed: {
    opacity: 0.75,
  },


  itemDetails: {
    flex: 1,
    minWidth: 0,
  },


  itemTitle: {
    ...TYPOGRAPHY.cardTitle,
  },


  itemSubtitle: {
    ...TYPOGRAPHY.subtitle,
    marginTop: 4,
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


  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
  },



  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },


  footerText: {
    marginLeft: 5,
    fontSize: 13,
    color: '#777777',
  },


  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },

  loadErrorText: {
    ...TYPOGRAPHY.body,
    marginTop: 8,
    color: '#777777',
    textAlign: 'center',
  },

  loadErrorAction: {
    alignSelf: 'stretch',
    marginTop: 24,
  },
});