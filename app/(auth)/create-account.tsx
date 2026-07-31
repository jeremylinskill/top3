import AuthProviderButton from '@/components/auth-provider-button';
import {
  signInWithApple,
  signInWithGoogle,
} from '@/services/auth-service';
import { router } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateAccountScreen() {
  async function handleAppleSignUp() {
    try {
      await signInWithApple();
      router.replace('/');
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }

      console.error(
        'Apple sign-in failed:',
        error
      );

      Alert.alert(
        'Unable to continue with Apple',
        'Please try again.'
      );
    }
  }

async function handleGoogleSignUp() {
  try {
    const result = await signInWithGoogle();

    if (!result) {
      return;
    }

    router.replace('/');
  } catch (error) {
    // User closed the Google account picker.
    if (
      error instanceof Error &&
      (
        error.message.includes('cancel') ||
        error.message.includes('cancelled') ||
        error.message.includes('canceled')
      )
    ) {
      return;
    }

    console.error(
      'Google sign-in failed:',
      error
    );

    Alert.alert(
      'Unable to continue with Google',
      'Please try again.'
    );
  }
}

  function handleEmailSignUp() {
    router.push('/sign-up-email');
  }

  function handleSignIn() {
    router.push('/sign-in-email');
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
          <Text style={styles.backButtonText}>
            ←
          </Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>
            Create your account
          </Text>

          <Text style={styles.description}>
            Start discovering people who share your
            favorite things.
          </Text>
        </View>

        <View style={styles.options}>
          <AuthProviderButton
            title="Continue with Apple"
            icon="logo-apple"
            onPress={handleAppleSignUp}
          />

          <AuthProviderButton
            title="Continue with Google"
            icon="logo-google"
            onPress={handleGoogleSignUp}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />

            <Text style={styles.dividerText}>
              OR
            </Text>

            <View style={styles.dividerLine} />
          </View>

          <AuthProviderButton
            title="Continue with Email"
            icon="mail-outline"
            variant="primary"
            onPress={handleEmailSignUp}
          />
        </View>

        <View style={styles.signInContainer}>
          <Text style={styles.signInPrompt}>
            Already have an account?
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            hitSlop={8}
            onPress={handleSignIn}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.signInButtonText}>
              Sign In
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
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  backButtonText: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '400',
    color: '#222222',
  },

  header: {
    marginTop: 36,
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  description: {
    marginTop: 12,
    maxWidth: 320,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },

  options: {
    marginTop: 48,
    gap: 14,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D9D9D9',
  },

  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#777777',
  },

  signInContainer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signInPrompt: {
    fontSize: 16,
    lineHeight: 22,
    color: '#666666',
  },

  signInButton: {
    marginLeft: 5,
  },

  signInButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1573DD',
  },

  pressed: {
    opacity: 0.6,
  },
});