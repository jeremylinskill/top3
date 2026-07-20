import { useTop3 } from '@/context/top3-context';
import { Top3Item } from '@/types/top3-item';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { searchMovies } from '../providers/tmdb';

export default function MovieSearchScreen() {
  const { rank } = useLocalSearchParams();
  const { currentList, setItemAtRank } = useTop3();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Top3Item[]>([]);

  const isHorrorCollection =
    currentList?.category === 'movies' &&
    currentList.topic?.toLowerCase() === 'horror';

  useEffect(() => {
    async function loadResults() {
      try {
        const results = await searchMovies(
          searchQuery,
          currentList?.topic
        );

        setSearchResults(results);
      } catch (error) {
        console.error('Movie search failed:', error);
        setSearchResults([]);
      }
    }

    loadResults();
  }, [searchQuery, currentList?.topic]);

  function selectMovie(item: Top3Item) {
    const selectedRank = Number(rank);

    if (selectedRank < 1 || selectedRank > 3) {
      return;
    }

    setItemAtRank(selectedRank, item);
    router.back();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isHorrorCollection ? 'Search Horror Movies' : 'Search Movies'}
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder={
          isHorrorCollection
            ? 'Search for a horror movie...'
            : 'Search for a movie...'
        }
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCorrect={false}
        autoCapitalize="words"
      />

      <Text style={styles.sectionTitle}>
        {isHorrorCollection ? 'Horror Results' : 'Search Results'}
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {searchResults.map((item) => (
          <Pressable
            key={item.id}
            style={styles.movieRow}
            onPress={() => selectMovie(item)}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.poster}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.posterPlaceholder}>
                <Text style={styles.posterPlaceholderText}>
                  No poster
                </Text>
              </View>
            )}

            <View style={styles.movieDetails}>
              <Text style={styles.movieTitle}>{item.title}</Text>

              <Text style={styles.metadata}>
                {item.subtitle || 'Year unknown'}
                {typeof item.rating === 'number'
                  ? ` · ★ ${item.rating.toFixed(1)}`
                  : ''}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
  },
  posterPlaceholder: {
    width: 64,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  posterPlaceholderText: {
    fontSize: 12,
    color: '#777777',
    textAlign: 'center',
  },
  movieDetails: {
    flex: 1,
    marginLeft: 16,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  metadata: {
    fontSize: 16,
    color: '#777777',
    marginTop: 6,
  },
});