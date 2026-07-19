import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function MoviesScreen() {
    const { selectedMovie } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your Top 3 Movies</Text>

      <Text style={styles.subtitle}>
        Pick the three movies that say the most about your taste.
      </Text>
      <Pressable
  style={styles.movieSlot}
  onPress={() => router.push('/movie-search')}>
  <Text style={styles.rank}>1</Text>
  <Text style={styles.placeholder}>
  {selectedMovie || 'Choose your #1 movie'}
</Text>
</Pressable>
<View style={styles.movieSlot}>
  <Text style={styles.rank}>2</Text>
  <Text style={styles.placeholder}>Choose your #2 movie</Text>
</View>
<View style={styles.movieSlot}>
  <Text style={styles.rank}>3</Text>
  <Text style={styles.placeholder}>Choose your #3 movie</Text>
</View>
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
  movieSlot: {
  width: '100%',
  borderWidth: 1,
  borderColor: '#CCCCCC',
  borderRadius: 12,
  padding: 20,
  marginTop: 32,
},
rank: {
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 8,
},
placeholder: {
  fontSize: 18,
  color: '#777777',
},
});