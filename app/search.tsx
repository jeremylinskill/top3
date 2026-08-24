import Chip from '@/components/chip';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import SearchResultSkeleton from '@/components/search-result-skeleton';
import { getCategoryArtworkRule } from '@/constants/category-artwork-rules';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useAudioPreview } from '@/context/audio-preview-context';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { useTop3 } from '@/context/top3-context';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { getMovieTrailerUrl } from '@/providers/movies-and-tv';
import {
  getPopularSuggestionsByCategory,
  getSearchProvider,
} from '@/providers/search';
import { getPublishedPosts } from '@/services/post-service';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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

const MINIMUM_SEARCH_LENGTH = 3;
const MINIMUM_COLLECTIONS_FOR_POPULARITY = 50;

const SEARCH_CACHE = new Map<string, Top3Item[]>();

const CATEGORY_SUGGESTIONS: Record<
  string,
  Top3Item[]
> = {
  movies: [
    {
      id: 'fallback-movies-the-godfather',
      title: 'The Godfather',
    },
    {
      id: 'fallback-movies-parasite',
      title: 'Parasite',
    },
    {
      id: 'fallback-movies-spirited-away',
      title: 'Spirited Away',
    },
    {
      id: 'fallback-movies-the-dark-knight',
      title: 'The Dark Knight',
    },
    {
      id: 'fallback-movies-everything-everywhere-all-at-once',
      title: 'Everything Everywhere All at Once',
    },
  ],
  tv: [
    {
      id: 'fallback-tv-breaking-bad',
      title: 'Breaking Bad',
    },
    {
      id: 'fallback-tv-the-bear',
      title: 'The Bear',
    },
    {
      id: 'fallback-tv-succession',
      title: 'Succession',
    },
    {
      id: 'fallback-tv-severance',
      title: 'Severance',
    },
    {
      id: 'fallback-tv-the-last-of-us',
      title: 'The Last of Us',
    },
  ],
  books: [
    {
      id: 'fallback-books-the-hobbit',
      title: 'The Hobbit',
    },
    {
      id: 'fallback-books-dune',
      title: 'Dune',
    },
    {
      id: 'fallback-books-the-handmaids-tale',
      title: 'The Handmaid’s Tale',
    },
    {
      id: 'fallback-books-project-hail-mary',
      title: 'Project Hail Mary',
    },
    {
      id: 'fallback-books-the-great-gatsby',
      title: 'The Great Gatsby',
    },
  ],
  games: [
    {
      id: 'fallback-games-the-legend-of-zelda',
      title: 'The Legend of Zelda',
    },
    {
      id: 'fallback-games-baldurs-gate-3',
      title: 'Baldur’s Gate 3',
    },
    {
      id: 'fallback-games-red-dead-redemption-2',
      title: 'Red Dead Redemption 2',
    },
    {
      id: 'fallback-games-hades',
      title: 'Hades',
    },
    {
      id: 'fallback-games-the-last-of-us',
      title: 'The Last of Us',
    },
  ],
};

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

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
      title="Movie trailer"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  </body>
</html>
  `.trim();
}


export default function SearchScreen() {
  const params = useLocalSearchParams();

  const rank = params.rank;

  const sourceParam = Array.isArray(params.source)
    ? params.source[0]
    : params.source;

  const {
    currentList,
    setItemAtRank: setCurrentListItemAtRank,
  } = useTop3();

  const {
    collection: onboardingCollection,
    setItemAtRank: setOnboardingItemAtRank,
  } = useOnboardingCollection();

  const isOnboardingSearch =
    sourceParam === 'onboarding';

  const activeCollection =
    isOnboardingSearch
      ? onboardingCollection
      : currentList;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Top3Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] =
    useState<string | null>(null);
  const [
    loadingTrailerItemId,
    setLoadingTrailerItemId,
  ] = useState<string | null>(null);
  const [
    activeTrailerUrl,
    setActiveTrailerUrl,
  ] = useState<string | null>(null);
  const [
    activeTrailerTitle,
    setActiveTrailerTitle,
  ] = useState<string | null>(null);
  const [
    suggestionPool,
    setSuggestionPool,
  ] = useState<Top3Item[]>([]);

  const [
    popularSuggestions,
    setPopularSuggestions,
  ] = useState<Top3Item[]>([]);

  const [
    isLoadingSuggestions,
    setIsLoadingSuggestions,
  ] = useState(true);

  const [
    seenSuggestionIds,
    setSeenSuggestionIds,
  ] = useState<string[]>([]);

  const {
    activePreviewItemId,
    isPreviewPlaying,
    togglePreview,
    stopPreview,
  } = useAudioPreview();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const suggestionsOpacity =
    useRef(new Animated.Value(1)).current;
  const suggestionsTranslateY =
    useRef(new Animated.Value(0)).current;
  const shuffleRotation =
    useRef(new Animated.Value(0)).current;
  const isShuffling = useRef(false);
  const latestSearchId = useRef(0);
  const trackedSearchKeys = useRef(
    new Set<string>()
  );

  const selectedCategory = TOP3_CATEGORIES.find(
    (category) => category.id === activeCollection?.category
  );

  const selectedType =
    selectedCategory?.types?.find(
      (type) =>
        type.name.toLowerCase() ===
        activeCollection?.type?.toLowerCase()
    );

  const availableTopics =
    selectedType?.topics ??
    selectedCategory?.topics ??
    [];

  const selectedTopic =
    availableTopics.find(
      (topic) =>
        topic.name.toLowerCase() ===
        activeCollection?.topic?.toLowerCase()
    ) ??
    availableTopics.find(
      (topic) => topic.id === 'general'
    );

  const categoryName = selectedCategory?.name ?? 'Items';

  const artworkRule =
    getCategoryArtworkRule(
      activeCollection?.category ?? ''
    );

  const topicName =
    selectedTopic?.id === 'general' &&
    selectedType
      ? selectedType.name
      : selectedTopic?.name;

  const searchItemName =
    selectedTopic?.searchItemName ??
    selectedType?.searchItemName ??
    'item';

  const searchIcon =
    selectedTopic?.icon ??
    selectedType?.icon ??
    selectedCategory?.icon ??
    '⭐';

  const placeholderIcon =
    selectedCategory?.placeholderIcon ?? 'image-outline';

  const isGeneralTopic =
    selectedTopic?.id === 'general' &&
    !selectedType;

  const fallbackSuggestions =
    CATEGORY_SUGGESTIONS[
      activeCollection?.category ?? ''
    ] ?? [];

  const suggestions =
    isLoadingSuggestions
      ? []
      : popularSuggestions.length > 0
        ? popularSuggestions
        : fallbackSuggestions;

  const trimmedQuery = searchQuery.trim();
  const canSearch =
    trimmedQuery.length >= MINIMUM_SEARCH_LENGTH;

  useEffect(() => {
    let isMounted = true;

    setIsLoadingSuggestions(true);
    setSuggestionPool([]);
    setPopularSuggestions([]);
    setSeenSuggestionIds([]);

    async function loadPopularSuggestions() {
      const categoryId = activeCollection?.category;
      const topic = activeCollection?.topic;

      if (!categoryId) {
        setSuggestionPool([]);
        setPopularSuggestions([]);
        setSeenSuggestionIds([]);
        setIsLoadingSuggestions(false);
        return;
      }

      async function loadProviderSuggestions(
        resolvedCategoryId: string
      ) {
        try {
          const providerResults =
            await getPopularSuggestionsByCategory(
              resolvedCategoryId,
              topic,
              20
            );

          if (!isMounted) {
            return;
          }

          if (providerResults.length > 0) {
            const initialSuggestions =
              providerResults.slice(0, 5);

            setSuggestionPool(
              providerResults
            );
            setPopularSuggestions(
              initialSuggestions
            );
            setSeenSuggestionIds(
              initialSuggestions.map(
                (item) => item.id
              )
            );
            setIsLoadingSuggestions(false);

            return;
          }

          setSuggestionPool([]);
          setPopularSuggestions([]);
          setSeenSuggestionIds([]);
          setIsLoadingSuggestions(false);
        } catch (error) {
          console.warn(
            'Failed to load provider suggestions:',
            error
          );

          if (isMounted) {
            setSuggestionPool([]);
            setPopularSuggestions([]);
            setSeenSuggestionIds([]);
            setIsLoadingSuggestions(false);
          }
        }
      }

      try {
        const publishedPosts =
          await getPublishedPosts();

        const normalizedCategory =
          normalizeValue(categoryId);

        const normalizedTopic =
          normalizeValue(topic) || 'general';

        const matchingPosts =
          publishedPosts.filter((post) => {
            const postCategory =
              normalizeValue(
                post.collection.category
              );

            const postTopic =
              normalizeValue(
                post.collection.topic
              ) || 'general';

            return (
              postCategory ===
                normalizedCategory &&
              postTopic === normalizedTopic
            );
          });

        if (
          matchingPosts.length >=
          MINIMUM_COLLECTIONS_FOR_POPULARITY
        ) {
          const scores = new Map<
            string,
            {
              item: Top3Item;
              score: number;
              appearances: number;
            }
          >();

          matchingPosts.forEach((post) => {
            post.collection.items.forEach(
              (item, index) => {
                if (!item) {
                  return;
                }

                const itemKey =
                  item.id?.toString() ||
                  normalizeValue(item.title);

                if (!itemKey) {
                  return;
                }

                const rankScore = 3 - index;
                const existing =
                  scores.get(itemKey);

                scores.set(itemKey, {
                  item,
                  score:
                    (existing?.score ?? 0) +
                    rankScore,
                  appearances:
                    (existing?.appearances ??
                      0) + 1,
                });
              }
            );
          });

          const communitySuggestions =
            Array.from(scores.values())
              .sort((a, b) => {
                if (b.score !== a.score) {
                  return b.score - a.score;
                }

                if (
                  b.appearances !==
                  a.appearances
                ) {
                  return (
                    b.appearances -
                    a.appearances
                  );
                }

                return a.item.title.localeCompare(
                  b.item.title
                );
              })
              .slice(0, 5)
              .map((entry) => entry.item);

          if (
            isMounted &&
            communitySuggestions.length > 0
          ) {
            setSuggestionPool(
              communitySuggestions
            );
            setPopularSuggestions(
              communitySuggestions
            );
            setSeenSuggestionIds(
              communitySuggestions.map(
                (item) => item.id
              )
            );
            setIsLoadingSuggestions(false);
            return;
          }
        }

        await loadProviderSuggestions(categoryId);
      } catch (error) {
        console.warn(
          'Failed to load community suggestions. Falling back to provider suggestions.',
          error
        );

        await loadProviderSuggestions(categoryId);
      }
    }

    void loadPopularSuggestions();

    return () => {
      isMounted = false;
    };
  }, [
    activeCollection?.category,
    activeCollection?.topic,
  ]);

  function trackCompletedSearch(
    searchKey: string,
    categoryId: string
  ) {
    if (
      trackedSearchKeys.current.has(
        searchKey
      )
    ) {
      return;
    }

    trackedSearchKeys.current.add(
      searchKey
    );

    trackAnalyticsEvent(
      'search_performed',
      {
        category: categoryId,
      }
    );
  }

  useEffect(() => {
    const effectSearchId =
      ++latestSearchId.current;

    async function loadResults() {
      if (!canSearch) {
        setSearchResults([]);
        setHasSearched(false);
        setSearchError(null);
        setIsLoading(false);
        return;
      }

      const categoryId = activeCollection?.category;

      if (!categoryId) {
        setSearchResults([]);
        setHasSearched(true);
        setSearchError(
          'Search is temporarily unavailable. Please try again.'
        );
        setIsLoading(false);
        return;
      }

      const cacheKey = [
        categoryId,
        activeCollection?.topic?.trim().toLowerCase() ??
          'general',
        trimmedQuery.toLowerCase(),
      ].join('|');

      const cachedResults = SEARCH_CACHE.get(cacheKey);

      if (cachedResults) {
        setSearchResults(cachedResults);
        setHasSearched(true);
        setSearchError(null);
        setIsLoading(false);

        trackCompletedSearch(
          cacheKey,
          categoryId
        );

        return;
      }

      const searchProvider =
        getSearchProvider(categoryId);

      if (!searchProvider) {
        if (__DEV__) {
          console.warn(
            `No search provider exists for: ${categoryId}`
          );
        }

        setSearchResults([]);
        setHasSearched(true);
        setSearchError(
          `${categoryName} search is temporarily unavailable.`
        );
        setIsLoading(false);
        return;
      }

      setSearchError(null);
      setIsLoading(true);

      const searchId = effectSearchId;

      try {
        const results = await searchProvider(
          trimmedQuery,
          activeCollection?.topic
        );

        if (
          searchId !== latestSearchId.current
        ) {
          return;
        }

        SEARCH_CACHE.set(cacheKey, results);
        setSearchResults(results);
        setHasSearched(true);
        setSearchError(null);

        trackCompletedSearch(
          cacheKey,
          categoryId
        );
      } catch (error) {
        if (
          searchId !== latestSearchId.current
        ) {
          return;
        }

        if (__DEV__) {
          console.warn(
            `${categoryName} search failed:`,
            error
          );
        }

        const unavailableMessage =
          categoryId === 'games'
            ? 'Video game search is temporarily unavailable. Please try again in a few minutes.'
            : `${categoryName} search is temporarily unavailable. Please try again.`;

        setSearchResults([]);
        setHasSearched(true);
        setSearchError(unavailableMessage);
      } finally {
        if (
          searchId === latestSearchId.current
        ) {
          setIsLoading(false);
        }
      }
    }

    const timeoutId = setTimeout(loadResults, 200);

    return () => clearTimeout(timeoutId);
  }, [
    canSearch,
    categoryName,
    activeCollection?.category,
    activeCollection?.topic,
    trimmedQuery,
  ]);

  useEffect(() => {
    if (isLoading || searchResults.length === 0) {
      fadeAnim.setValue(0);
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, isLoading, searchResults]);


  function refreshSuggestions() {
    if (
      suggestionPool.length <= 5 ||
      isShuffling.current
    ) {
      return;
    }

    const unseenSuggestions =
      suggestionPool.filter(
        (suggestion) =>
          !seenSuggestionIds.includes(
            suggestion.id
          )
      );

    const shouldResetSeen =
      unseenSuggestions.length < 5;

    const refreshedSeenSuggestionIds =
      shouldResetSeen
        ? popularSuggestions.map(
            (suggestion) => suggestion.id
          )
        : seenSuggestionIds;

    const refreshedUnseenSuggestions =
      suggestionPool.filter(
        (suggestion) =>
          !refreshedSeenSuggestionIds.includes(
            suggestion.id
          )
      );

    const currentSuggestionIds =
      new Set(
        popularSuggestions.map(
          (suggestion) => suggestion.id
        )
      );

    const source =
      refreshedUnseenSuggestions.length >= 5
        ? refreshedUnseenSuggestions
        : suggestionPool.filter(
            (suggestion) =>
              !currentSuggestionIds.has(
                suggestion.id
              )
          );

    const shuffled = [...source];

    for (
      let index = shuffled.length - 1;
      index > 0;
      index -= 1
    ) {
      const randomIndex = Math.floor(
        Math.random() * (index + 1)
      );

      [
        shuffled[index],
        shuffled[randomIndex],
      ] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }

    isShuffling.current = true;
    shuffleRotation.setValue(0);

    Animated.timing(shuffleRotation, {
      toValue: 1,
      duration: 290,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(
        suggestionsOpacity,
        {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }
      ),
      Animated.timing(
        suggestionsTranslateY,
        {
          toValue: -6,
          duration: 120,
          useNativeDriver: true,
        }
      ),
    ]).start(() => {
      const nextSuggestions =
        shuffled.slice(0, 5);

      setPopularSuggestions(
        nextSuggestions
      );

      setSeenSuggestionIds((current) => {
        const baseSeenIds =
          shouldResetSeen
            ? popularSuggestions.map(
                (suggestion) =>
                  suggestion.id
              )
            : current;

        return [
          ...new Set([
            ...baseSeenIds,
            ...nextSuggestions.map(
              (suggestion) =>
                suggestion.id
            ),
          ]),
        ];
      });

      suggestionsTranslateY.setValue(6);

      Animated.parallel([
        Animated.timing(
          suggestionsOpacity,
          {
            toValue: 1,
            duration: 170,
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          suggestionsTranslateY,
          {
            toValue: 0,
            duration: 170,
            useNativeDriver: true,
          }
        ),
      ]).start(() => {
        isShuffling.current = false;
      });
    });
  }

function chooseSuggestion(
  suggestion: Top3Item
) {
  setSearchQuery(
    suggestion.title
  );
}

  async function playMovieTrailer(item: Top3Item) {
    const movieIdMatch = /^movie-(\d+)$/.exec(item.id);

    if (!movieIdMatch) {
      return;
    }

    const movieId = Number(movieIdMatch[1]);

    if (!Number.isFinite(movieId)) {
      return;
    }

    setLoadingTrailerItemId(item.id);

    try {
      const trailerUrl = await getMovieTrailerUrl(movieId);

      if (!trailerUrl) {
        return;
      }

      const embedUrl =
        getYouTubeEmbedUrl(trailerUrl);

      if (!embedUrl) {
        return;
      }

      stopPreview();
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

  function closeTrailer() {
    setActiveTrailerUrl(null);
    setActiveTrailerTitle(null);
  }

  function selectItem(item: Top3Item) {
    const selectedRank = Number(rank);

    if (selectedRank < 1 || selectedRank > 3) {
      return;
    }

    stopPreview();

    if (isOnboardingSearch) {
      setOnboardingItemAtRank(
        selectedRank,
        item
      );
    } else {
      setCurrentListItemAtRank(
        selectedRank,
        item
      );
    }

    trackAnalyticsEvent(
      'item_added',
      {
        category: activeCollection?.category,
        rank: selectedRank,
        source: 'search',
      }
    );

    router.back();
  }

const searchTitle = selectedType
  ? activeCollection?.topic
    ? `Search ${selectedType.name} • ${topicName}`
    : `Search ${selectedType.name}`
  : activeCollection?.topic
    ? `Search ${categoryName} • ${topicName}`
    : `Search ${categoryName}`;

  const searchPlaceholder =
    `Search for a ${searchItemName}...`;

  const resultsTitle = activeCollection?.topic
    ? `${categoryName} • ${topicName} Results`
    : `${categoryName} Results`;

  const shuffleRotationDegrees =
    shuffleRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader showBackButton />

      <PageHeader title={searchTitle} />

      <View style={styles.content}>
        <View style={styles.searchInputWrapper}>
          <SearchInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            accessibilityLabel={searchPlaceholder}
            onClear={() => {
              setSearchResults([]);
              setHasSearched(false);
              setSearchError(null);
            }}
          />
        </View>

        {!canSearch ? (
          <Text style={styles.searchHelper}>
            Type at least {MINIMUM_SEARCH_LENGTH}{' '}
            characters to search.
          </Text>
        ) : null}

        {!hasSearched && !canSearch && suggestions.length > 0 ? (
          <View style={styles.suggestionsSection}>
            <View style={styles.suggestionsHeader}>
  <Text style={styles.suggestionsTitle}>
    Suggestions
  </Text>

  {suggestionPool.length > 5 ? (
    <Pressable
      style={({ pressed }) => [
        styles.shuffleButton,
        pressed && styles.shuffleButtonPressed,
      ]}
      onPress={refreshSuggestions}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Shuffle suggestions">
      <Animated.View
        style={{
          transform: [
            {
              rotate:
                shuffleRotationDegrees,
            },
          ],
        }}>
        <Ionicons
          name="shuffle"
          size={16}
          color="#5928ed"
        />
      </Animated.View>

      <Text style={styles.shuffleText}>
        Shuffle
      </Text>
    </Pressable>
  ) : null}
</View>

            <Animated.View
              style={{
                opacity:
                  suggestionsOpacity,
                transform: [
                  {
                    translateY:
                      suggestionsTranslateY,
                  },
                ],
              }}>
              <View style={styles.suggestionList}>
                {suggestions.map(
                  (suggestion) => (
                    <Chip
                      key={suggestion.id}
                      label={suggestion.title}
                      onPress={() =>
                        chooseSuggestion(
                          suggestion
                        )
                      }
                    />
                  )
                )}
              </View>
            </Animated.View>
          </View>
        ) : null}

          {isLoading ? (
            <>
              <Text style={styles.sectionTitle}>
                {resultsTitle}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                  styles.resultsContent
                }>
                {Array.from(
                  { length: 5 },
                  (_, index) => (
                    <SearchResultSkeleton
  key={index}
  artworkWidth={artworkRule.width}
  artworkHeight={artworkRule.height}
/>
                  )
                )}
              </ScrollView>
            </>
          ) : !hasSearched ? (
            <View style={styles.emptySpace} />
          ) : searchError ? (
            <View style={styles.messageContainer}>
              <Ionicons
                name="cloud-offline-outline"
                size={42}
                color="#777777"
                style={styles.messageErrorIcon}
              />

              <Text style={styles.messageTitle}>
                Search unavailable
              </Text>

              <Text style={styles.messageText}>
                {searchError}
              </Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageIcon}>
                {searchIcon}
              </Text>

              <Text style={styles.messageTitle}>
                No {searchItemName} results found
              </Text>

              <Text style={styles.messageText}>
                Try another title or a broader search.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {resultsTitle}
              </Text>

              <Animated.View
                style={[
                  styles.resultsContainer,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY:
                          fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [6, 0],
                          }),
                      },
                    ],
                  },
                ]}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={
                    styles.resultsContent
                  }>
                  {searchResults.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.resultRow}
                      onPress={() => selectItem(item)}>
                      <View
                        style={[
                          styles.imageContainer,
                          {
                            width: artworkRule.width,
                            height: artworkRule.height,
                          },
                        ]}>
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={[
                              styles.image,
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
                            <Ionicons
                              name={placeholderIcon}
                              size={28}
                              color="#999999"
                            />
                          </View>
                        )}

                      </View>

                      <View style={styles.resultDetails}>
                        <Text style={styles.resultTitle}>
                          {item.title}
                        </Text>

                        <Text style={styles.metadata}>
                          {item.subtitle ||
                            'Details unavailable'}
                          {typeof item.rating === 'number'
                            ? ` · ★ ${item.rating.toFixed(1)}`
                            : ''}
                        </Text>
                      </View>

                      {activeCollection?.category === 'movies' &&
                      /^movie-\d+$/.test(item.id) ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.previewButton,
                            pressed &&
                              styles.previewButtonPressed,
                          ]}
                          onPress={(event) => {
                            event.stopPropagation();
                            void playMovieTrailer(item);
                          }}
                          disabled={loadingTrailerItemId === item.id}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={`Play trailer for ${item.title}`}>
                          <Ionicons
                            name={
                              loadingTrailerItemId === item.id
                                ? 'ellipsis-horizontal'
                                : 'play'
                            }
                            size={17}
                            color="#555555"
                            style={
                              loadingTrailerItemId === item.id
                                ? undefined
                                : styles.previewPlayIcon
                            }
                          />
                        </Pressable>
                      ) : null}

                      {item.previewUrl ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.previewButton,
                            pressed &&
                              styles.previewButtonPressed,
                          ]}
                          onPress={(event) => {
                            event.stopPropagation();
                            void togglePreview(item);
                          }}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={
                            activePreviewItemId === item.id &&
                            isPreviewPlaying
                              ? `Pause preview of ${item.title}`
                              : `Play preview of ${item.title}`
                          }>
                          <Ionicons
                            name={
                              activePreviewItemId === item.id &&
                              isPreviewPlaying
                                ? 'pause'
                                : 'play'
                            }
                            size={17}
                            color="#555555"
                            style={
                              activePreviewItemId === item.id &&
                              isPreviewPlaying
                                ? undefined
                                : styles.previewPlayIcon
                            }
                          />
                        </Pressable>
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </Animated.View>
            </>
          )}
      </View>

      <Modal
        visible={Boolean(activeTrailerUrl)}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closeTrailer}>
        <SafeAreaView
          style={styles.trailerModal}
          edges={['top', 'right', 'bottom', 'left']}>
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
              size={30}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.trailerModalContent}>
            {activeTrailerUrl ? (
              <View style={styles.trailerPlayer}>
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
    backgroundColor: '#F8F8F8',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#F8F8F8',
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

  trailerCloseButton: {
    position: 'absolute',
    top: 30,
    right: 14,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  trailerCloseButtonPressed: {
    opacity: 0.7,
  },

  searchInputWrapper: {
    marginBottom: 24,
  },

  searchHelper: {
    marginTop: -14,
    marginBottom: 20,
    fontSize: 14,
    color: '#777777',
  },

  suggestionsSection: {
    marginTop: 4,
  },

  suggestionsTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#222222',
},

  suggestionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },

  resultsContainer: {
    flex: 1,
  },

  emptySpace: {
    flex: 1,
  },

  messageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 48,
    paddingHorizontal: 24,
  },

  messageIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  messageErrorIcon: {
    marginBottom: 12,
  },

  messageTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },

  messageText: {
    fontSize: 16,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
  },

  resultsContent: {
    paddingBottom: 24,
  },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  imageContainer: {
    position: 'relative',
    width: 64,
    height: 96,
  },

  image: {
    width: 64,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
  },

  previewButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    marginLeft: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F1F1',
  },

  previewPlayIcon: {
    transform: [{ translateX: 1 }],
  },

  previewButtonPressed: {
    opacity: 0.75,
  },

  imagePlaceholder: {
    width: 64,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultDetails: {
    flex: 1,
    marginLeft: 16,
  },

  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  metadata: {
    fontSize: 16,
    color: '#777777',
    marginTop: 6,
    lineHeight: 22,
  },

  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F1F1',
  },

  shuffleButtonPressed: {
    opacity: 0.65,
  },

  shuffleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5928ed',
  },

  suggestionsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
},

});