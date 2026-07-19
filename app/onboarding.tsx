import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Top3</Text>

      <Text style={styles.subtitle}>
        Let's find people who share your favourite things.
      </Text>

      <Pressable
  style={styles.button}
  onPress={() => router.push('/category')}>
  <Text style={styles.buttonText}>Continue</Text>
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
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  button: {
  backgroundColor: '#000000',
  paddingVertical: 16,
  paddingHorizontal: 32,
  borderRadius: 12,
  marginTop: 32,
},
buttonText: {
  color: '#FFFFFF',
  fontSize: 18,
  fontWeight: '600',
},
});