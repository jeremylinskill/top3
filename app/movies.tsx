import MovieSlot from '@/components/movie-slot';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function MoviesScreen() {
    const { selectedMovie, rank } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your Top 3 Movies</Text>

      <Text style={styles.subtitle}>
        Pick the three movies that say the most about your taste.
      </Text>
      <MovieSlot
  rank={1}
  title={
  rank === '1' && selectedMovie
    ? selectedMovie.toString()
    : 'Choose your #1 movie'
}
  onPress={() =>
  router.push({
    pathname: '/movie-search',
    params: { rank: '1' },
  })}
/>
<MovieSlot
  rank={2}
  title="Choose your #2 movie"
  onPress={() =>
  router.push({
    pathname: '/movie-search',
    params: { rank: '2' },
  })}
/>
<MovieSlot
  rank={3}
  title="Choose your #3 movie"
  onPress={() =>
  router.push({
    pathname: '/movie-search',
    params: { rank: '3' },
  })}
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
  },
});