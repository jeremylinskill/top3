import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import AuthProviderButton from '@/components/auth-provider-button';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  resendConfirmationEmail,
} from '@/services/auth-service';
import {
  getAwaitingEmailVerificationEmail,
} from '@/services/onboarding-service';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  useEffect,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CheckEmailScreen() {
  const colors = useAppColors();

  const [
    verificationEmail,
    setVerificationEmail,
  ] = useState<string | null>(null);

  const [
    hasVerificationEmailLoadError,
    setHasVerificationEmailLoadError,
  ] = useState(false);

  const [
    verificationEmailLoadAttempt,
    setVerificationEmailLoadAttempt,
  ] = useState(0);

  const [
    isEmailSentSheetVisible,
    setIsEmailSentSheetVisible,
  ] = useState(false);

  const [
    resendRateLimitMessage,
    setResendRateLimitMessage,
  ] = useState<string | null>(null);

  const [
    isOpenEmailErrorSheetVisible,
    setIsOpenEmailErrorSheetVisible,
  ] = useState(false);

  const [
    resendErrorMessage,
    setResendErrorMessage,
  ] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadVerificationEmail() {
      try {
        const email =
          await getAwaitingEmailVerificationEmail();

        if (isMounted) {
          setVerificationEmail(email);
          setHasVerificationEmailLoadError(
            false
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Unable to load verification email:',
            error
          );
        }

        if (isMounted) {
          setHasVerificationEmailLoadError(
            true
          );
        }
      }
    }

    void loadVerificationEmail();

    return () => {
      isMounted = false;
    };
  }, [verificationEmailLoadAttempt]);

  function retryVerificationEmailLoad() {
    setHasVerificationEmailLoadError(false);
    setVerificationEmailLoadAttempt(
      (currentAttempt) =>
        currentAttempt + 1
    );
  }

  async function handleOpenEmail() {
    try {
      await Linking.openURL('message://');
    } catch (error) {
      console.error(
        'Unable to open email app:',
        error
      );

      setIsOpenEmailErrorSheetVisible(true);
    }
  }

  async function handleResendEmail() {
    try {
      const email =
        verificationEmail ??
        await getAwaitingEmailVerificationEmail();

      if (!email) {
        setResendErrorMessage(
          'We could not determine which email address is waiting for verification. Please use a different email address and try again.'
        );

        return;
      }

      await resendConfirmationEmail(email);

      setIsEmailSentSheetVisible(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '';

      const isRateLimited =
        message
          .toLowerCase()
          .includes(
            'you can only request this after'
          );

      if (isRateLimited) {
        setResendRateLimitMessage(message);
        return;
      }

      console.error(
        'Unable to resend confirmation email:',
        error
      );

      setResendErrorMessage(
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    }
  }

  function handleDifferentEmail() {
    router.replace('/sign-up-email');
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
        <View style={styles.content}>
          <View style={styles.mainContent}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    colors.secondarySurface,
                },
              ]}>
              <Ionicons
                name="mail-outline"
                size={48}
                color={colors.accent}
              />
            </View>

            <View style={styles.header}>
              <AppText
                variant="heroTitle"
                style={styles.title}>
                Check your email
              </AppText>

              <AppText
                variant="bodyLarge"
                tone="secondary"
                style={styles.description}>
                We sent a confirmation link
                {verificationEmail ? (
                  <>
                    {' to '}
                    <AppText
                      variant="bodyLarge"
                      tone="primary"
                      emphasis="semibold">
                      {verificationEmail}
                    </AppText>
                  </>
                ) : null}
                . Open the email and tap the link to verify
                your account.
              </AppText>
            </View>

            <View style={styles.instructions}>
              <View style={styles.instruction}>
                <View
                  style={[
                    styles.stepNumber,
                    {
                      backgroundColor:
                        colors.secondarySurface,
                    },
                  ]}>
                  <AppText
                    variant="caption"
                    tone="accent">
                    1
                  </AppText>
                </View>

                <AppText
                  variant="bodyLarge"
                  tone="secondary"
                  style={styles.instructionText}>
                  Open the confirmation email from Top3.
                </AppText>
              </View>

              <View style={styles.instruction}>
                <View
                  style={[
                    styles.stepNumber,
                    {
                      backgroundColor:
                        colors.secondarySurface,
                    },
                  ]}>
                  <AppText
                    variant="caption"
                    tone="accent">
                    2
                  </AppText>
                </View>

                <AppText
                  variant="bodyLarge"
                  tone="secondary"
                  style={styles.instructionText}>
                  Tap the confirmation link in the email.
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <AuthProviderButton
              title="Open Email App"
              variant="primary"
              onPress={handleOpenEmail}
            />

            <View style={styles.resendContainer}>
              <AppText
                variant="bodyLarge"
                tone="secondary">
                Didn&apos;t receive it?
              </AppText>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Resend confirmation email"
                hitSlop={8}
                onPress={handleResendEmail}
                style={({ pressed }) => [
                  styles.inlineButton,
                  pressed && styles.pressed,
                ]}>
                <AppText
                  variant="bodyLarge"
                  tone="accent"
                  emphasis="strong">
                  Resend Email
                </AppText>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use a different email address"
              hitSlop={8}
              onPress={handleDifferentEmail}
              style={({ pressed }) => [
                styles.differentEmailButton,
                pressed && styles.pressed,
              ]}>
              <AppText
                variant="body"
                tone="secondary"
                emphasis="semibold"
                style={styles.differentEmailText}>
                Use a different email address
              </AppText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ActionSheet
        visible={hasVerificationEmailLoadError}
        title="Unable to load email address"
        message="Please try again."
        actions={[
          {
            label: 'Try Again',
            onPress: retryVerificationEmailLoad,
          },
        ]}
        onClose={() => {
          setHasVerificationEmailLoadError(
            false
          );
        }}
      />

      <ActionSheet
        visible={isEmailSentSheetVisible}
        title="Email sent"
        message="We sent you a new confirmation email."
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setIsEmailSentSheetVisible(false);
            },
          },
        ]}
        onClose={() => {
          setIsEmailSentSheetVisible(false);
        }}
      />

      <ActionSheet
        visible={Boolean(resendRateLimitMessage)}
        title="Unable to resend email"
        message={resendRateLimitMessage ?? ''}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setResendRateLimitMessage(null);
            },
          },
        ]}
        onClose={() => {
          setResendRateLimitMessage(null);
        }}
      />

      <ActionSheet
        visible={isOpenEmailErrorSheetVisible}
        title="Unable to open email"
        message="Open your email app and look for the confirmation message from Top3."
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setIsOpenEmailErrorSheetVisible(false);
            },
          },
        ]}
        onClose={() => {
          setIsOpenEmailErrorSheetVisible(false);
        }}
      />

      <ActionSheet
        visible={resendErrorMessage !== null}
        title="Unable to resend email"
        message={resendErrorMessage ?? ''}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setResendErrorMessage(null);
            },
          },
        ]}
        onClose={() => {
          setResendErrorMessage(null);
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
    paddingTop: 48,
    paddingBottom: 24,
  },

  mainContent: {
    alignItems: 'center',
  },

  iconContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
  },

  header: {
    marginTop: 32,
    alignItems: 'center',
  },

  title: {
    textAlign: 'center',
  },

  description: {
    marginTop: 14,
    maxWidth: 340,
    textAlign: 'center',
  },

  instructions: {
    width: '100%',
    marginTop: 36,
    gap: 20,
  },

  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stepNumber: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },

  instructionText: {
    flex: 1,
    marginLeft: 14,
  },

  actions: {
    marginTop: 'auto',
    alignItems: 'center',
  },

  resendContainer: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inlineButton: {
    marginLeft: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  differentEmailButton: {
    marginTop: 34,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  differentEmailText: {
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.6,
  },
});
