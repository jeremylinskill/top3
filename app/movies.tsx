import MovieSlot from '@/components/movie-slot';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function MoviesScreen() {
    const { movie1, movie2, movie3 } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your Top 3 Movies</Text>

      <Text style={styles.subtitle}>
        Pick the three movies that say the most about your taste.
      </Text>
      <MovieSlot
  rank={1}
  title={movie1?.toString() || 'Choose your #1 movie'}
  onPress={() =>
  router.push({
    pathname: '/movie-search',
    params: {
  rank: '1',
  movie1: movie1?.toString() || '',
  movie2: movie2?.toString() || '',
  movie3: movie3?.toString() || '',
},
  })}
/>
<MovieSlot
  rank={2}
 title={movie2?.toString() || 'Choose your #2 movie'}
  onPress={() =>
  router.push({
    pathname: '/movie-search',
    params: {
  rank: '2',
  movie1: movie1?.toString() || '',
  movie2: movie2?.toString() || '',
  movie3: movie3?.toString() || '',
},
  })}
/>
<MovieSlot
  rank={3}
  title={movie3?.toString() || 'Choose your #3 movie'}
  onPress={() =>
  router.push({
    pathname: '/movie-search',
    params: {
  rank: '3',
  movie1: movie1?.toString() || '',
  movie2: movie2?.toString() || '',
  movie3: movie3?.toString() || '',
},
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