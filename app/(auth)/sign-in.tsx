import EmailAuthButton from '@/components/email-auth-button';
import GoogleAuthButton from '@/components/google-auth-button';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import {
    signInWithApple,
    signInWithGoogle,
} from '@/services/auth-service';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  async function handleAppleSignIn() {
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

  async function handleGoogleSignIn() {
    try {
      const result = await signInWithGoogle();

      if (!result) {
        return;
      }

      router.replace('/');
    } catch (error) {
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

  function handleEmailSignIn() {
    router.push('/sign-in-email');
  }

  function handleCreateAccount() {
    router.replace('/create-account');
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>
      <ScreenHeader />

      <PageHeader
        title="Welcome back"
        subtitle="Sign in to continue discovering people who share your favorite things."
        align="center"
      />

      <View style={styles.content}>
        <View style={styles.options}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication
                .AppleAuthenticationButtonType.CONTINUE
            }
            buttonStyle={
              AppleAuthentication
                .AppleAuthenticationButtonStyle.WHITE_OUTLINE
            }
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />

          <GoogleAuthButton
            onPress={handleGoogleSignIn}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />

            <Text style={styles.dividerText}>
              OR
            </Text>

            <View style={styles.dividerLine} />
          </View>

          <EmailAuthButton
            onPress={handleEmailSignIn}
          />
        </View>

        <View style={styles.signUpContainer}>
          <Text style={styles.signUpPrompt}>
            Don&apos;t have an account?
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
    backgroundColor: COLORS.background,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  options: {
    marginTop: 28,
    gap: 14,
  },

  appleButton: {
    width: '100%',
    height: 54,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: COLORS.tertiaryText,
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
    color: COLORS.tertiaryText,
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