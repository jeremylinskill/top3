import ActionSheet from '@/components/action-sheet';
import AuthProviderButton from '@/components/auth-provider-button';
import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
import {
  resendConfirmationEmail,
} from '@/services/auth-service';
import {
  getAwaitingEmailVerificationEmail,
} from '@/services/onboarding-service';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CheckEmailScreen() {
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
        style={styles.container}
        edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.mainContent}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="mail-outline"
                size={48}
                color={COLORS.accent}
              />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>
                Check your email
              </Text>

              <Text style={styles.description}>
                We sent you a confirmation link. Open the
                email and tap the link to verify your
                account.
              </Text>
            </View>

            <View style={styles.instructions}>
              <View style={styles.instruction}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>
                    1
                  </Text>
                </View>

                <Text style={styles.instructionText}>
                  Open the confirmation email from Top3.
                </Text>
              </View>

              <View style={styles.instruction}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>
                    2
                  </Text>
                </View>

                <Text style={styles.instructionText}>
                  Tap the confirmation link in the email.
                </Text>
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
              <Text style={styles.resendPrompt}>
                Didn&apos;t receive it?
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Resend confirmation email"
                hitSlop={8}
                onPress={handleResendEmail}
                style={({ pressed }) => [
                  styles.inlineButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.inlineButtonText}>
                  Resend Email
                </Text>
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
              <Text style={styles.differentEmailText}>
                Use a different email address
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

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
    backgroundColor: '#FAFAFA',
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
    backgroundColor: '#EAF3FD',
  },

  header: {
    marginTop: 32,
    alignItems: 'center',
  },

  title: {
    ...TYPOGRAPHY.heroTitle,
    textAlign: 'center',
  },

  description: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 14,
    maxWidth: 340,
    color: '#666666',
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
    backgroundColor: '#EAF3FD',
  },

  stepNumberText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
  },

  instructionText: {
    ...TYPOGRAPHY.bodyLarge,
    flex: 1,
    marginLeft: 14,
    color: '#444444',
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

  resendPrompt: {
    ...TYPOGRAPHY.bodyLarge,
    color: '#666666',
  },

  inlineButton: {
    marginLeft: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  inlineButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.accent,
  },

  differentEmailButton: {
    marginTop: 34,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  differentEmailText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
    color: '#666666',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.6,
  },
});