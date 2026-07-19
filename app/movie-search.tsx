import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function MovieSearchScreen() {
  const { rank, movie1, movie2, movie3 } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Movies</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search for a movie..."
      />

      <Text style={styles.sectionTitle}>Popular Movies</Text>

      <Pressable
  onPress={() =>
   router.replace({
  pathname: '/movies',
  params: {
  movie1: rank === '1' ? 'The Dark Knight' : movie1?.toString() || '',
  movie2: rank === '2' ? 'The Dark Knight' : movie2?.toString() || '',
  movie3: rank === '3' ? 'The Dark Knight' : movie3?.toString() || '',
},
})
  }>
  <Text style={styles.movie}>The Dark Knight</Text>
</Pressable>
      <Text style={styles.movie}>Interstellar</Text>
      <Text style={styles.movie}>Pulp Fiction</Text>
      <Text style={styles.movie}>The Shawshank Redemption</Text>
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