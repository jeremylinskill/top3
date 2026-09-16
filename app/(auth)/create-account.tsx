import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import AuthProviderButton from '@/components/auth-provider-button';
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
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ErrorSheet = {
  title: string;
  message: string;
};

export default function CreateAccountScreen() {
  const colors = useAppColors();

  const {
    collection: onboardingCollection,
    prepareAuthHandoff,
  } = useOnboardingCollection();

  const [
    errorSheet,
    setErrorSheet,
  ] = useState<ErrorSheet | null>(null);

  const isSavingOnboardingCollection =
    Boolean(onboardingCollection);

  async function prepareSignUpIntent() {
    if (isSavingOnboardingCollection) {
      await prepareAuthHandoff('sign-up');
    }
  }

  async function handleAppleSignUp() {
    try {
      await prepareSignUpIntent();

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

      setErrorSheet({
        title: 'Unable to continue with Apple',
        message: 'Please try again.',
      });
    }
  }

  async function handleGoogleSignUp() {
    try {
      await prepareSignUpIntent();

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

      setErrorSheet({
        title: 'Unable to continue with Google',
        message: 'Please try again.',
      });
    }
  }

  async function handleEmailSignUp() {
    try {
      await prepareSignUpIntent();
      router.push('/sign-up-email');
    } catch (error) {
      console.error(
        'Failed to prepare email sign-up:',
        error
      );

      setErrorSheet({
        title: 'Unable to continue',
        message: 'Please try again.',
      });
    }
  }

  function handleSignIn() {
    if (isSavingOnboardingCollection) {
      router.push({
        pathname: '/sign-in',
        params: {
          source: 'onboarding-publish',
        },
      });
      return;
    }

    router.push('/sign-in');
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
          title="Save your Top 3"
          subtitle={
            'Create your account to publish your list\nand start building your taste profile.'
          }
          align="center"
        />

        <View style={styles.content}>
          <View style={styles.options}>
            <AuthProviderButton
              title="Continue with Apple"
              icon="logo-apple"
              onPress={handleAppleSignUp}
              titleStyle={styles.appleButtonLabel}
            />

            <GoogleAuthButton
              onPress={handleGoogleSignUp}
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
              onPress={handleEmailSignUp}
            />

            <AppText
              variant="bodyLarge"
              tone="tertiary"
              style={styles.ageNotice}>
              {
                'By continuing, you confirm that you’re\nat least 13 years old.'
              }
            </AppText>
          </View>

          <View style={styles.signInContainer}>
            <AppText
              variant="bodyLarge"
              tone="tertiary">
              Already have an account?
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              hitSlop={8}
              onPress={handleSignIn}
              style={({ pressed }) => [
                styles.signInButton,
                pressed && styles.pressed,
              ]}>
              <AppText variant="action">
                Sign In
              </AppText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ActionSheet
        visible={Boolean(errorSheet)}
        title={errorSheet?.title ?? ''}
        message={errorSheet?.message ?? ''}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setErrorSheet(null);
            },
          },
        ]}
        onClose={() => {
          setErrorSheet(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
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

  appleButtonLabel: {
    fontSize: 20,
    lineHeight: 24,
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

  ageNotice: {
    marginTop: 2,
    paddingHorizontal: 12,
    textAlign: 'center',
  },

  signInContainer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signInButton: {
    marginLeft: 5,
  },

  pressed: {
    opacity: 0.6,
  },
});
