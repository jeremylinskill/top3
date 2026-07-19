import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function CategoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your first category</Text>

      <Text style={styles.subtitle}>
        We'll start with one thing you love.
      </Text>
        <Pressable
  style={styles.categoryButton}
  onPress={() => router.push('/movies')}>
  <Text style={styles.categoryButtonText}>Movies</Text>
</Pressable>
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
categoryButton: {
  backgroundColor: '#000000',
  paddingVertical: 16,
  paddingHorizontal: 32,
  borderRadius: 12,
  marginTop: 32,
},

categoryButtonText: {
  color: '#FFFFFF',
  fontSize: 20,
  fontWeight: '600',
},
});