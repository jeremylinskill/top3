import EmailSignUpForm from '@/components/email-sign-up-form';
import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpEmailScreen() {
  function handleSuccess() {
    router.replace('/check-email');
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>
            Create your account
          </Text>

          <Text style={styles.description}>
            Create your account with your email
            address.
          </Text>
        </View>

        <View style={styles.form}>
          <EmailSignUpForm
            onSuccess={handleSuccess}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },

  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },

  backButtonText: {
    fontSize: 26,
    color: '#222222',
  },

  header: {
    marginTop: 28,
    marginBottom: 40,
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  description: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 28,
    color: '#666666',
    textAlign: 'center',
  },

  form: {
    flex: 1,
  },

  pressed: {
    opacity: 0.6,
  },
});