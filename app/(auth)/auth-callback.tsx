import AppText from '@/components/app-text';
import { useAppColors } from '@/hooks/use-app-colors';
import { setSessionFromUrl } from '@/services/auth-service';
import {
  setAwaitingEmailVerification,
} from '@/services/onboarding-service';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthCallbackScreen() {
  const colors = useAppColors();
  const url = Linking.useLinkingURL();

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      return;
    }

    let isMounted = true;

    async function completeEmailConfirmation() {
      try {
        const session =
          await setSessionFromUrl(url!);

        if (!session) {
          if (isMounted) {
            setErrorMessage(
              'This confirmation link has expired or has already been used. Please return to sign in and request a new confirmation email if needed.'
            );
          }

          return;
        }

        await setAwaitingEmailVerification(
          false
        );

        if (isMounted) {
          router.replace('/');
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to complete email confirmation:',
            error
          );
        }

        if (isMounted) {
          setErrorMessage(
            'We could not verify your email. Please return to sign in and try again.'
          );
        }
      }
    }

    void completeEmailConfirmation();

    return () => {
      isMounted = false;
    };
  }, [url]);

  function returnToSignIn() {
    router.replace('/sign-in');
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'bottom']}>
      <View style={styles.content}>
        {errorMessage ? (
          <>
            <AppText
              variant="pageTitle"
              style={styles.title}>
              Unable to verify email
            </AppText>

            <AppText
              variant="bodyLarge"
              style={styles.description}>
              {errorMessage}
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to sign in"
              onPress={returnToSignIn}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor:
                    colors.primary,
                },
                pressed && styles.buttonPressed,
              ]}>
              <AppText
                variant="bodyLarge"
                tone="onPrimary"
                emphasis="strong">
                Return to Sign In
              </AppText>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator
              size="large"
              color={colors.text}
            />

            <AppText
              variant="pageTitle"
              style={styles.title}>
              Verifying your email…
            </AppText>

            <AppText
              variant="bodyLarge"
              style={styles.description}>
              We&apos;re finishing your Top3 account.
            </AppText>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  title: {
    marginTop: 24,
    textAlign: 'center',
  },

  description: {
    marginTop: 12,
    maxWidth: 340,
    textAlign: 'center',
  },

  button: {
    width: '100%',
    minHeight: 54,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  buttonPressed: {
    opacity: 0.8,
  },
});
