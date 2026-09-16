import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import EmailAuthButton from '@/components/email-auth-button';
import GoogleAuthButton from '@/components/google-auth-button';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  signInWithApple,
  signInWithGoogle,
} from '@/services/auth-service';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SignInProvider = 'Apple' | 'Google';

const SPLASH_ICON_SIZE = 200;

export default function SignInScreen() {
  const colors = useAppColors();
  const colorScheme = useColorScheme();

  const {
    source,
  } = useLocalSearchParams<{
    source?: string;
  }>();

  const {
    setAuthIntent,
  } = useOnboardingCollection();

  const [
    failedSignInProvider,
    setFailedSignInProvider,
  ] = useState<SignInProvider | null>(null);

  const [isSigningIn, setIsSigningIn] =
    useState(false);

  const isReturningFromOnboarding =
    source === 'onboarding-publish';

  const splashBackgroundColor =
    colorScheme === 'dark'
      ? '#000000'
      : '#FFFFFF';

  function prepareSignInIntent() {
    if (isReturningFromOnboarding) {
      setAuthIntent('sign-in');
    }
  }

  async function handleAppleSignIn() {
    try {
      setIsSigningIn(true);
      prepareSignInIntent();

      await signInWithApple();

      router.replace(
        isReturningFromOnboarding
          ? '/'
          : '/feed'
      );
    } catch (error) {
      setIsSigningIn(false);

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

      setFailedSignInProvider('Apple');
    }
  }

  async function handleGoogleSignIn() {
    try {
      setIsSigningIn(true);
      prepareSignInIntent();

      const result = await signInWithGoogle();

      if (!result) {
        setIsSigningIn(false);
        return;
      }

      router.replace(
        isReturningFromOnboarding
          ? '/'
          : '/feed'
      );
    } catch (error) {
      setIsSigningIn(false);

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

      setFailedSignInProvider('Google');
    }
  }

  function handleEmailSignIn() {
    prepareSignInIntent();

    if (isReturningFromOnboarding) {
      router.push({
        pathname: '/sign-in-email',
        params: {
          source: 'onboarding-publish',
        },
      });
      return;
    }

    router.push('/sign-in-email');
  }

  function handleBottomAction() {
    if (isReturningFromOnboarding) {
      router.replace('/create-account');
      return;
    }

    router.replace('/onboarding');
  }

  if (isSigningIn) {
    return (
      <View
        style={[
          styles.splashBridge,
          {
            backgroundColor:
              splashBackgroundColor,
          },
        ]}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
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
              <View
                style={[
                  styles.dividerLine,
                  {
                    backgroundColor:
                      colors.border,
                  },
                ]}
              />

              <AppText
                variant="micro"
                tone="tertiary"
                emphasis="semibold"
                style={styles.dividerText}>
                OR
              </AppText>

              <View
                style={[
                  styles.dividerLine,
                  {
                    backgroundColor:
                      colors.border,
                  },
                ]}
              />
            </View>

            <EmailAuthButton
              onPress={handleEmailSignIn}
            />
          </View>

          <View style={styles.signUpContainer}>
            <AppText
              variant="bodyLarge"
              tone="tertiary">
              {isReturningFromOnboarding
                ? "Don't have an account?"
                : 'New to Top 3?'}
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isReturningFromOnboarding
                  ? 'Create account'
                  : 'Get started'
              }
              hitSlop={8}
              onPress={handleBottomAction}
              style={({ pressed }) => [
                styles.signUpButton,
                pressed && styles.pressed,
              ]}>
              <AppText variant="action">
                {isReturningFromOnboarding
                  ? 'Create one'
                  : 'Get Started'}
              </AppText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ActionSheet
        visible={failedSignInProvider !== null}
        title={
          failedSignInProvider
            ? `Unable to continue with ${failedSignInProvider}`
            : ''
        }
        message="Please try again."
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setFailedSignInProvider(null);
            },
          },
        ]}
        onClose={() => {
          setFailedSignInProvider(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  splashBridge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  splashIcon: {
    width: SPLASH_ICON_SIZE,
    height: SPLASH_ICON_SIZE,
  },

  container: {
    flex: 1,
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
  },

  dividerText: {
    marginHorizontal: 14,
    lineHeight: 16,
  },

  signUpContainer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signUpButton: {
    marginLeft: 5,
  },

  pressed: {
    opacity: 0.6,
  },
});
