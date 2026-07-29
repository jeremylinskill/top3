import AuthProviderButton from '@/components/auth-provider-button';
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
  function handleAppleSignUp() {
    Alert.alert(
      'Apple sign-up',
      'Apple authentication will be connected in a later step.'
    );
  }

  function handleGoogleSignUp() {
    Alert.alert(
      'Google sign-up',
      'Google authentication will be connected in a later step.'
    );
  }

  function handleEmailSignUp() {
    router.push('/sign-up-email');
  }

  function handleSignIn() {
    Alert.alert(
      'Sign in',
      'The sign-in flow will be built after email account creation.'
    );
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