import SearchResultSkeleton from '@/components/search-result-skeleton';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { searchBooks } from '@/providers/google-books';
import { searchGames } from '@/providers/rawg';
import {
  searchMovies,
  searchTvShows,
} from '@/providers/tmdb';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

const SEARCH_CACHE = new Map<string, Top3Item[]>();

export default function SearchScreen() {
  const { rank } = useLocalSearchParams();
  const { currentList, setItemAtRank } = useTop3();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Top3Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const selectedCategory = TOP3_CATEGORIES.find(
    (category) => category.id === currentList?.category
  );

  const selectedTopic =
    selectedCategory?.topics.find(
      (topic) =>
        topic.name.toLowerCase() === currentList?.topic?.toLowerCase()
    ) ??
    selectedCategory?.topics.find((topic) => topic.id === 'general');

  const categoryName = selectedCategory?.name ?? 'Items';
  const topicName = selectedTopic?.name;
  const searchItemName = selectedTopic?.searchItemName ?? 'item';
  const searchIcon =
    selectedTopic?.icon ?? selectedCategory?.icon ?? '⭐';
  const isGeneralTopic = selectedTopic?.id === 'general';

  const trimmedQuery = searchQuery.trim();
  const canSearch = trimmedQuery.length >= MINIMUM_SEARCH_LENGTH;

  const placeholderIcon =
  selectedCategory?.placeholderIcon ?? 'image-outline';

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
  currentList?.topic?.trim().toLowerCase() ?? 'general',
  trimmedQuery.toLowerCase(),
].join('|');

const cachedResults = SEARCH_CACHE.get(cacheKey);

if (cachedResults) {
  setSearchResults(cachedResults);
  setHasSearched(true);
  setIsLoading(false);
  return;
}

      const searchProvider = SEARCH_PROVIDERS[categoryId];

      if (!searchProvider) {
        console.error(`No search provider exists for: ${categoryId}`);
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
        console.error(`${categoryName} search failed:`, error);
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

  const searchPlaceholder = `Search for a ${searchItemName}...`;

  const resultsTitle = isGeneralTopic
    ? 'Search Results'
    : `${topicName} Results`;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <View style={styles.container}>
        <Text style={styles.title}>{searchTitle}</Text>

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
            Type at least {MINIMUM_SEARCH_LENGTH} characters to search.
          </Text>
        ) : null}

        {isLoading ? (
          <>
            <Text style={styles.sectionTitle}>{resultsTitle}</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.resultsContent}>
              {Array.from({ length: 5 }, (_, index) => (
                <SearchResultSkeleton key={index} />
              ))}
            </ScrollView>
          </>
        ) : !hasSearched ? (
          <View style={styles.emptySpace} />
        ) : searchResults.length === 0 ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageIcon}>{searchIcon}</Text>

            <Text style={styles.messageTitle}>
              No {searchItemName} results found
            </Text>

            <Text style={styles.messageText}>
              Try another title or a broader search.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{resultsTitle}</Text>

            <Animated.View
              style={[
                styles.resultsContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
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
                contentContainerStyle={styles.resultsContent}>
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
                      <View style={styles.imagePlaceholder}>
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
                        {item.subtitle || 'Details unavailable'}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginBottom: 24,
  },

  searchHelper: {
    fontSize: 14,
    color: '#777777',
    marginTop: -14,
    marginBottom: 20,
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