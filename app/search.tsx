import Chip from '@/components/chip';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import SearchResultSkeleton from '@/components/search-result-skeleton';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { searchBooks } from '@/providers/google-books';
import { searchGames } from '@/providers/rawg';
import {
  searchMovies,
  searchTvShows,
} from '@/providers/tmdb';
import { getPublishedPosts } from '@/services/post-service';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SearchProvider = (
  query: string,
  topic?: string
) => Promise<Top3Item[]>;

const SEARCH_PROVIDERS: Record<string, SearchProvider> = {
  movies: searchMovies,
  books: searchBooks,
  tv: searchTvShows,
  games: searchGames,
};

const MINIMUM_SEARCH_LENGTH = 3;
const MINIMUM_COLLECTIONS_FOR_POPULARITY = 50;

const SEARCH_CACHE = new Map<string, Top3Item[]>();

const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  movies: [
    'The Godfather',
    'Parasite',
    'Spirited Away',
    'The Dark Knight',
    'Everything Everywhere All at Once',
  ],
  tv: [
    'Breaking Bad',
    'The Bear',
    'Succession',
    'Severance',
    'The Last of Us',
  ],
  books: [
    'The Hobbit',
    'Dune',
    'The Handmaid’s Tale',
    'Project Hail Mary',
    'The Great Gatsby',
  ],
  games: [
    'The Legend of Zelda',
    'Baldur’s Gate 3',
    'Red Dead Redemption 2',
    'Hades',
    'The Last of Us',
  ],
};

const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  comedy: [
    'The Office',
    'Parks and Recreation',
    'Schitt’s Creek',
    'Ted Lasso',
    'Brooklyn Nine-Nine',
  ],
  drama: [
    'The Sopranos',
    'Mad Men',
    'Succession',
    'The Wire',
    'Better Call Saul',
  ],
  documentary: [
    'Planet Earth',
    'The Last Dance',
    'Free Solo',
    '13th',
    'Won’t You Be My Neighbor?',
  ],
  horror: [
    'The Shining',
    'Get Out',
    'Hereditary',
    'The Haunting of Hill House',
    'Resident Evil',
  ],
  sciencefiction: [
    'Dune',
    'Blade Runner 2049',
    'The Expanse',
    'Mass Effect',
    'Foundation',
  ],
  fantasy: [
    'The Lord of the Rings',
    'Game of Thrones',
    'The Witcher',
    'Baldur’s Gate 3',
    'The Name of the Wind',
  ],
};

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeSuggestionKey(value?: string) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') ?? '';
}

export default function SearchScreen() {
  const { rank } = useLocalSearchParams();
  const { currentList, setItemAtRank } = useTop3();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Top3Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [
    popularSuggestions,
    setPopularSuggestions,
  ] = useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const selectedCategory = TOP3_CATEGORIES.find(
    (category) => category.id === currentList?.category
  );

  const selectedTopic =
    selectedCategory?.topics.find(
      (topic) =>
        topic.name.toLowerCase() ===
        currentList?.topic?.toLowerCase()
    ) ??
    selectedCategory?.topics.find(
      (topic) => topic.id === 'general'
    );

  const categoryName = selectedCategory?.name ?? 'Items';
  const topicName = selectedTopic?.name;
  const searchItemName =
    selectedTopic?.searchItemName ?? 'item';

  const searchIcon =
    selectedTopic?.icon ??
    selectedCategory?.icon ??
    '⭐';

  const placeholderIcon =
    selectedCategory?.placeholderIcon ?? 'image-outline';

  const isGeneralTopic = selectedTopic?.id === 'general';

  const suggestionKey = normalizeSuggestionKey(
    selectedTopic?.id ?? selectedTopic?.name
  );

  const fallbackSuggestions =
    TOPIC_SUGGESTIONS[suggestionKey] ??
    CATEGORY_SUGGESTIONS[currentList?.category ?? ''] ??
    [];

  const suggestions =
    popularSuggestions.length > 0
      ? popularSuggestions
      : fallbackSuggestions;

  const trimmedQuery = searchQuery.trim();
  const canSearch =
    trimmedQuery.length >= MINIMUM_SEARCH_LENGTH;

  useEffect(() => {
    let isMounted = true;

    async function loadPopularSuggestions() {
      const categoryId = currentList?.category;
      const topic = currentList?.topic;

      if (!categoryId) {
        setPopularSuggestions([]);
        return;
      }

      try {
        const publishedPosts = await getPublishedPosts();

        const normalizedCategory =
          normalizeValue(categoryId);

        const normalizedTopic =
          normalizeValue(topic) || 'general';

        const matchingPosts = publishedPosts.filter(
          (post) => {
            const postCategory = normalizeValue(
              post.collection.category
            );

            const postTopic =
              normalizeValue(post.collection.topic) ||
              'general';

            return (
              postCategory === normalizedCategory &&
              postTopic === normalizedTopic
            );
          }
        );

        if (
          matchingPosts.length <
          MINIMUM_COLLECTIONS_FOR_POPULARITY
        ) {
          if (isMounted) {
            setPopularSuggestions([]);
          }

          return;
        }

        const scores = new Map<
          string,
          {
            title: string;
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
                const existing = scores.get(itemKey);

                scores.set(itemKey, {
                  title: item.title,
                  score:
                    (existing?.score ?? 0) +
                    rankScore,
                  appearances:
                    (existing?.appearances ?? 0) + 1,
                });
              }
            );
          });

        const nextSuggestions = Array.from(
          scores.values()
        )
          .sort((a, b) => {
            if (b.score !== a.score) {
              return b.score - a.score;
            }

            if (b.appearances !== a.appearances) {
              return b.appearances - a.appearances;
            }

            return a.title.localeCompare(b.title);
          })
          .slice(0, 5)
          .map((entry) => entry.title);

        if (isMounted) {
          setPopularSuggestions(nextSuggestions);
        }
      } catch (error) {
        console.error(
          'Failed to load popular search suggestions:',
          error
        );

        if (isMounted) {
          setPopularSuggestions([]);
        }
      }
    }

    loadPopularSuggestions();

    return () => {
      isMounted = false;
    };
  }, [
    currentList?.category,
    currentList?.topic,
  ]);

  useEffect(() => {
    async function loadResults() {
      if (!canSearch) {
        setSearchResults([]);
        setHasSearched(false);
        setIsLoading(false);
        return;
      }

      const categoryId = currentList?.category;

      if (!categoryId) {
        setSearchResults([]);
        setHasSearched(true);
        setIsLoading(false);
        return;
      }

      const cacheKey = [
        categoryId,
        currentList?.topic?.trim().toLowerCase() ??
          'general',
        trimmedQuery.toLowerCase(),
      ].join('|');

      const cachedResults = SEARCH_CACHE.get(cacheKey);

      if (cachedResults) {
        setSearchResults(cachedResults);
        setHasSearched(true);
        setIsLoading(false);
        return;
      }

      const searchProvider =
        SEARCH_PROVIDERS[categoryId];

      if (!searchProvider) {
        console.error(
          `No search provider exists for: ${categoryId}`
        );

        setSearchResults([]);
        setHasSearched(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const results = await searchProvider(
          trimmedQuery,
          currentList?.topic
        );

        SEARCH_CACHE.set(cacheKey, results);
        setSearchResults(results);
        setHasSearched(true);
      } catch (error) {
        console.error(
          `${categoryName} search failed:`,
          error
        );

        setSearchResults([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    }

    const timeoutId = setTimeout(loadResults, 200);

    return () => clearTimeout(timeoutId);
  }, [
    canSearch,
    categoryName,
    currentList?.category,
    currentList?.topic,
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

  function chooseSuggestion(suggestion: string) {
    setSearchQuery(suggestion);
  }

  function selectItem(item: Top3Item) {
    const selectedRank = Number(rank);

    if (selectedRank < 1 || selectedRank > 3) {
      return;
    }

    setItemAtRank(selectedRank, item);
    router.back();
  }

  const searchTitle = isGeneralTopic
    ? `Search ${categoryName}`
    : `Search ${topicName} ${categoryName}`;

  const searchPlaceholder =
    `Search for a ${searchItemName}...`;

  const resultsTitle = isGeneralTopic
    ? 'Search Results'
    : `${topicName} Results`;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader showBackButton />

      <PageHeader title={searchTitle} />

      <View style={styles.content}>
        <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="words"
          />

        {!canSearch ? (
          <Text style={styles.searchHelper}>
            Type at least {MINIMUM_SEARCH_LENGTH}{' '}
            characters to search.
          </Text>
        ) : null}

        {!hasSearched && !canSearch && suggestions.length > 0 ? (
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsTitle}>
              Suggestions
            </Text>

            <View style={styles.suggestionList}>
              {suggestions.map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  onPress={() => chooseSuggestion(suggestion)}
                />
              ))}
            </View>
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
                    <SearchResultSkeleton key={index} />
                  )
                )}
              </ScrollView>
            </>
          ) : !hasSearched ? (
            <View style={styles.emptySpace} />
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
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.image}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={styles.imagePlaceholder}>
                          <Ionicons
                            name={placeholderIcon}
                            size={28}
                            color="#999999"
                          />
                        </View>
                      )}

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
                    </Pressable>
                  ))}
                </ScrollView>
              </Animated.View>
            </>
          )}
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
    backgroundColor: '#F8F8F8',
  },

  searchInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
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
    marginBottom: 12,
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

  image: {
    width: 64,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
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
});