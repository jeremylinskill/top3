import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { searchBooks } from '@/providers/google-books';
import { searchMovies } from '@/providers/tmdb';
import { Top3Item } from '@/types/top3-item';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
};

export default function SearchScreen() {
  const { rank } = useLocalSearchParams();
  const { currentList, setItemAtRank } = useTop3();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Top3Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
  const searchIcon = selectedTopic?.icon ?? selectedCategory?.icon ?? '⭐';
  const isGeneralTopic = selectedTopic?.id === 'general';

  useEffect(() => {
    async function loadResults() {
      const trimmedQuery = searchQuery.trim();

      if (!trimmedQuery) {
        setSearchResults([]);
        setHasSearched(false);
        setIsLoading(false);
        return;
      }

      const categoryId = currentList?.category;

      if (!categoryId) {
        setSearchResults([]);
        setHasSearched(true);
        return;
      }

      const searchProvider = SEARCH_PROVIDERS[categoryId];

      if (!searchProvider) {
        console.error(`No search provider exists for: ${categoryId}`);
        setSearchResults([]);
        setHasSearched(true);
        return;
      }

      setIsLoading(true);

      try {
        const results = await searchProvider(
          trimmedQuery,
          currentList?.topic
        );

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

    const timeoutId = setTimeout(loadResults, 300);

    return () => clearTimeout(timeoutId);
  }, [
    searchQuery,
    currentList?.category,
    currentList?.topic,
    categoryName,
  ]);

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

  const imagePlaceholder =
    currentList?.category === 'books' ? 'No cover' : 'No poster';

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

        {isLoading ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.messageText}>Searching...</Text>
          </View>
        ) : !hasSearched ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageIcon}>{searchIcon}</Text>

            <Text style={styles.messageTitle}>
              Search for a {searchItemName}
            </Text>

            <Text style={styles.messageText}>
              Start typing a title to see matching results.
            </Text>
          </View>
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
                      <Text style={styles.imagePlaceholderText}>
                        {imagePlaceholder}
                      </Text>
                    </View>
                  )}

                  <View style={styles.resultDetails}>
                    <Text style={styles.resultTitle}>{item.title}</Text>

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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
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
    padding: 6,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#777777',
    textAlign: 'center',
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