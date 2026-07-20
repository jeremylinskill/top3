import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Movie = {
  id: number;
  title: string;
  release_date?: string;
};

export default function MovieSearchScreen() {
  const { rank, movie1, movie2, movie3 } = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  useEffect(() => {
    async function searchMovies() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;

        const response = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
            searchQuery
          )}`
        );

        if (!response.ok) {
          throw new Error(`TMDB request failed: ${response.status}`);
        }

        const data = await response.json();

        setSearchResults(data.results?.slice(0, 10) || []);
      } catch (error) {
        console.error('Movie search failed:', error);
        setSearchResults([]);
      }
    }

    searchMovies();
  }, [searchQuery]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Movies</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search for a movie..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCorrect={false}
      />

      <Text style={styles.sectionTitle}>Search Results</Text>

      {searchResults.map((movie) => {
        const releaseYear = movie.release_date?.slice(0, 4);

        return (
          <Pressable
            key={movie.id}
            onPress={() =>
              router.replace({
                pathname: '/movies',
                params: {
                  movie1:
                    rank === '1' ? movie.title : movie1?.toString() || '',
                  movie2:
                    rank === '2' ? movie.title : movie2?.toString() || '',
                  movie3:
                    rank === '3' ? movie.title : movie3?.toString() || '',
                },
              })
            }>
            <Text style={styles.movie}>
              {movie.title}
              {releaseYear ? ` (${releaseYear})` : ''}
            </Text>
          </Pressable>
        );
      })}
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
  movie: {
    fontSize: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
});