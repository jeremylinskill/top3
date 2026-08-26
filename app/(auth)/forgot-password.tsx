import ActionSheet from '@/components/action-sheet';

import AuthProviderButton from '@/components/auth-provider-button';

import PageHeader from '@/components/page-header';

import ScreenHeader from '@/components/screen-header';

import { COLORS } from '@/constants/colors';

import { requestPasswordReset } from '@/services/auth-service';

import * as Linking from 'expo-linking';

import { router } from 'expo-router';

import { useState } from 'react';

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

  return (
    <>
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom']}>
        <ScreenHeader showBackButton />

        <PageHeader
          title={
            hasSubmitted
              ? 'Check your email'
              : 'Forgot password?'
          }
          subtitle={
            hasSubmitted
              ? `We sent a password reset link to\n${email
                  .trim()
                  .toLowerCase()}.`
              : 'Enter your email and we’ll send you a link to reset your password.'
          }
          align="center"
        />

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
                  disabled={isSubmitting}
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
    marginBottom: 8,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#222222',
  },

  input: {
    width: '100%',
    minHeight: 54,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    color: '#222222',
  },

  buttonContainer: {
    marginTop: 8,
  },

  successContent: {
    marginTop: 28,
    alignItems: 'center',
  },

  successText: {
    maxWidth: 340,
    fontSize: 16,
    lineHeight: 24,
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1573DD',
  },

  pressed: {
    opacity: 0.6,
  },
});