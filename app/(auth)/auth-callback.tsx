import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
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
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthCallbackScreen() {
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
        console.error(
          'Failed to complete email confirmation:',
          error
        );

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
      style={styles.container}
      edges={['top', 'bottom']}>
      <View style={styles.content}>
        {errorMessage ? (
          <>
            <Text style={styles.title}>
              Unable to verify email
            </Text>

            <Text style={styles.description}>
              {errorMessage}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to sign in"
              onPress={returnToSignIn}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.buttonText}>
                Return to Sign In
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator
              size="large"
              color="#222222"
            />

            <Text style={styles.title}>
              Verifying your email…
            </Text>

            <Text style={styles.description}>
              We&apos;re finishing your Top3 account.
            </Text>
          </>
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  title: {
    ...TYPOGRAPHY.pageTitle,
    marginTop: 24,
    textAlign: 'center',
  },

  description: {
    ...TYPOGRAPHY.bodyLarge,
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
    backgroundColor: COLORS.primary,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
