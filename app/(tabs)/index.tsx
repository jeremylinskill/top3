import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Top3</Text>

      <Text style={styles.heading}>
        Find your people through what you love.
      </Text>

      <Text style={styles.description}>
        Share your favourite movies, music, books and more. Discover people who
        love the same things you do.
      </Text>

      <Pressable
  style={styles.button}
  onPress={() => router.push('/collections')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>

      <Text style={styles.signIn}>Already have an account? Sign In</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    color: '#555555',
    lineHeight: 28,
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signIn: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
  },
});