import EmailSignInForm from '@/components/email-sign-in-form';
import { router } from 'expo-router';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInEmailScreen() {
  function handleSuccess() {
  router.replace('/(tabs)');
}

  function handleCreateAccount() {
  router.replace('/create-account');
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
            Welcome back
          </Text>

          <Text style={styles.description}>
            Sign in with your email address and
            password.
          </Text>
        </View>

        <View style={styles.form}>
          <EmailSignInForm
            onSuccess={handleSuccess}
          />
        </View>

        <View style={styles.signUpContainer}>
          <Text style={styles.signUpPrompt}>
            Don't have an account?
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create account"
            hitSlop={8}
            onPress={handleCreateAccount}
            style={({ pressed }) => [
              styles.signUpButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.signUpButtonText}>
              Create one
            </Text>
          </Pressable>
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

  signUpContainer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signUpPrompt: {
    fontSize: 16,
    lineHeight: 22,
    color: '#666666',
  },

  signUpButton: {
    marginLeft: 5,
  },

  signUpButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1573DD',
  },

  pressed: {
    opacity: 0.6,
  },
});