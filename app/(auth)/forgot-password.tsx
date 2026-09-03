import ActionSheet from '@/components/action-sheet';
import AuthProviderButton from '@/components/auth-provider-button';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
import { requestPasswordReset } from '@/services/auth-service';

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import {
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

type ValidationSheet = {
  title: string;
  message: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [hasSubmitted, setHasSubmitted] =
    useState(false);

  const isFormValid =
    email.trim().length > 0;

  const [
    validationSheet,
    setValidationSheet,
  ] = useState<ValidationSheet | null>(null);

  const [
    isNetworkErrorSheetVisible,
    setIsNetworkErrorSheetVisible,
  ] = useState(false);

  const [
    errorSheet,
    setErrorSheet,
  ] = useState<ValidationSheet | null>(null);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      setValidationSheet({
        title: 'Email required',
        message: 'Enter your email address.',
      });

      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setValidationSheet({
        title: 'Invalid email',
        message: 'Enter a valid email address.',
      });

      return;
    }

    try {
      setIsSubmitting(true);

      await requestPasswordReset(
        normalizedEmail
      );

      setHasSubmitted(true);
    } catch (error) {
      const isNetworkError =
        error instanceof Error &&
        (
          error.name ===
            'AuthRetryableFetchError' ||
          error.message
            .toLowerCase()
            .includes(
              'network request failed'
            )
        );

      if (isNetworkError) {
        setIsNetworkErrorSheetVisible(true);

        return;
      }

      console.error(
        'Failed to request password reset:',
        error
      );

      setErrorSheet({
        title: 'Unable to send reset link',
        message: 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOpenEmail() {
    try {
      await Linking.openURL('message://');
    } catch (error) {
      console.error(
        'Unable to open email app:',
        error
      );

      setErrorSheet({
        title: 'Unable to open email',
        message:
          'Open your email app and look for the password reset message from Top3.',
      });
    }
  }

  function returnToSignIn() {
    router.replace('/sign-in-email');
  }

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  return (
    <>
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom']}>
        <ScreenHeader showBackButton />

        {hasSubmitted ? (
          <View style={styles.successHeader}>
            <Text style={styles.successTitle}>
              Check your email
            </Text>

            <Text style={styles.successSubtitle}>
              We sent a password reset link to{'\n'}
              <Text style={styles.emailText}>
                {normalizedEmail}
              </Text>
              .
            </Text>
          </View>
        ) : (
          <PageHeader
            title="Forgot password?"
            subtitle="Enter your email and we’ll send you a link to reset your password."
            align="center"
          />
        )}

        <View style={styles.content}>
          {hasSubmitted ? (
            <View style={styles.successContent}>
              <Text style={styles.successText}>
                Open the link in your email to choose a new password.
              </Text>

              <View style={styles.openEmailButtonContainer}>
                <AuthProviderButton
                  title="Open Email App"
                  variant="primary"
                  onPress={handleOpenEmail}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Return to sign in"
                hitSlop={8}
                onPress={returnToSignIn}
                style={({ pressed }) => [
                  styles.signInButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.signInButtonText}>
                  Return to Sign In
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>
                  Email
                </Text>

                <TextInput
                  accessibilityLabel="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  onSubmitEditing={() => {
                    void handleSubmit();
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor="#999999"
                  returnKeyType="done"
                  style={styles.input}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>

              <View style={styles.buttonContainer}>
                <AuthProviderButton
                  disabled={!isFormValid || isSubmitting}
                  loading={isSubmitting}
                  onPress={() => {
                    void handleSubmit();
                  }}
                  title="Send Reset Link"
                  variant="primary"
                />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>

      <ActionSheet
        visible={Boolean(validationSheet)}
        title={validationSheet?.title ?? ''}
        message={validationSheet?.message ?? ''}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setValidationSheet(null);
            },
          },
        ]}
        onClose={() => {
          setValidationSheet(null);
        }}
      />

      <ActionSheet
        visible={isNetworkErrorSheetVisible}
        title="Connection problem"
        message="Check your internet connection and try again."
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setIsNetworkErrorSheetVisible(false);
            },
          },
        ]}
        onClose={() => {
          setIsNetworkErrorSheetVisible(false);
        }}
      />

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
    backgroundColor: COLORS.background,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  form: {
    marginTop: 28,
  },

  field: {
    marginBottom: 20,
  },

  label: {
    ...TYPOGRAPHY.formLabel,
    marginBottom: 8,
  },

  input: {
    width: '100%',
    minHeight: 54,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
  },

  buttonContainer: {
    marginTop: 8,
  },

  successHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  successTitle: {
    ...TYPOGRAPHY.heroTitle,
    textAlign: 'center',
  },

  successSubtitle: {
    marginTop: 8,
    maxWidth: 340,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400',
    color: '#7A7A7A',
    textAlign: 'center',
  },

  emailText: {
    fontWeight: '600',
    color: COLORS.text,
  },

  successContent: {
    marginTop: 28,
    alignItems: 'center',
  },

  successText: {
    ...TYPOGRAPHY.bodyLarge,
    maxWidth: 340,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  openEmailButtonContainer: {
    width: '100%',
    marginTop: 28,
  },

  signInButton: {
    marginTop: 24,
    paddingVertical: 8,
  },

  signInButtonText: {
    ...TYPOGRAPHY.action,
  },

  pressed: {
    opacity: 0.6,
  },
});
