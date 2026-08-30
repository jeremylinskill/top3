import ActionSheet from '@/components/action-sheet';

import AuthProviderButton from '@/components/auth-provider-button';

import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';

import { signInWithEmail } from '@/services/auth-service';

import {
  setAwaitingEmailVerification,
  setAwaitingEmailVerificationEmail,
} from '@/services/onboarding-service';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import {
  useRef,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface EmailSignInFormProps {
  onSuccess: () => void;
}

type ValidationSheet = {
  title: string;
  message: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getSignInErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message
      .toLowerCase()
      .includes('invalid login credentials')
  ) {
    return 'The email or password you entered is incorrect.';
  }

  return 'Something went wrong while signing you in. Please try again.';
}

export default function EmailSignInForm({
  onSuccess,
}: EmailSignInFormProps) {
  const passwordInputRef =
    useRef<TextInput>(null);

  const [email, setEmail] = useState('');

  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
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
    isInvalidCredentialsSheetVisible,
    setIsInvalidCredentialsSheetVisible,
  ] = useState(false);

  const [
    signInErrorMessage,
    setSignInErrorMessage,
  ] = useState<string | null>(null);

  function validateForm() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setValidationSheet({
        title: 'Email required',
        message: 'Enter your email address.',
      });

      return false;
    }

    if (!isValidEmail(normalizedEmail)) {
      setValidationSheet({
        title: 'Invalid email',
        message: 'Enter a valid email address.',
      });

      return false;
    }

    if (!password) {
      setValidationSheet({
        title: 'Password required',
        message: 'Enter your password.',
      });

      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validateForm() || isSubmitting) {
      return;
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    try {
      setIsSubmitting(true);

      await signInWithEmail({
        email: normalizedEmail,
        password,
      });

      onSuccess();
    } catch (error) {
      const isEmailNotConfirmed =
        error instanceof Error &&
        error.message
          .toLowerCase()
          .includes('email not confirmed');

      if (isEmailNotConfirmed) {
        await setAwaitingEmailVerification(
          true
        );

        await setAwaitingEmailVerificationEmail(
          normalizedEmail
        );

        router.replace('/check-email');

        return;
      }

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

      const isInvalidCredentials =
        error instanceof Error &&
        error.message
          .toLowerCase()
          .includes(
            'invalid login credentials'
          );

      if (isInvalidCredentials) {
        setIsInvalidCredentialsSheetVisible(
          true
        );

        return;
      }

      const message =
        getSignInErrorMessage(error);

      console.error(
        'Failed to sign in:',
        error
      );

      setSignInErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <View style={styles.container}>
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
            importantForAutofill="yes"
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={() =>
              passwordInputRef.current?.focus()
            }
            placeholder="you@example.com"
            placeholderTextColor="#999999"
            returnKeyType="next"
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Password
          </Text>

          <View style={styles.passwordInputContainer}>
            <TextInput
              ref={passwordInputRef}
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={setPassword}
              onSubmitEditing={() => {
                void handleSubmit();
              }}
              placeholder="Enter your password"
              placeholderTextColor="#999999"
              returnKeyType="done"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              textContentType="password"
              value={password}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
              disabled={isSubmitting}
              hitSlop={8}
              onPress={() =>
                setShowPassword(
                  (currentValue) =>
                    !currentValue
                )
              }
              style={({ pressed }) => [
                styles.visibilityButton,
                pressed &&
                  !isSubmitting &&
                  styles.visibilityButtonPressed,
              ]}>
              <Ionicons
                name={
                  showPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={22}
                color="#666666"
              />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            disabled={isSubmitting}
            hitSlop={8}
            onPress={() =>
              router.push('/forgot-password')
            }
            style={({ pressed }) => [
              styles.forgotPasswordButton,
              pressed &&
                !isSubmitting &&
                styles.forgotPasswordButtonPressed,
            ]}>
            <Text
              style={styles.forgotPasswordText}>
              Forgot password?
            </Text>
          </Pressable>
        </View>

        <View style={styles.buttonContainer}>
          <AuthProviderButton
            disabled={
              !email.trim() ||
              !password ||
              isSubmitting
            }
            loading={isSubmitting}
            onPress={() => {
              void handleSubmit();
            }}
            title="Sign In"
            variant="primary"
          />
        </View>
      </View>

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
        message="We couldn't connect to Top3. Check your internet connection and try again."
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
        visible={isInvalidCredentialsSheetVisible}
        title="Unable to sign in"
        message="The email or password you entered is incorrect."
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setIsInvalidCredentialsSheetVisible(
                false
              );
            },
          },
        ]}
        onClose={() => {
          setIsInvalidCredentialsSheetVisible(
            false
          );
        }}
      />

      <ActionSheet
        visible={signInErrorMessage !== null}
        title="Unable to sign in"
        message={signInErrorMessage ?? ''}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setSignInErrorMessage(null);
            },
          },
        ]}
        onClose={() => {
          setSignInErrorMessage(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
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

  passwordInputContainer: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },

  passwordInput: {
    flex: 1,
    minHeight: 54,
    paddingLeft: 16,
    paddingRight: 8,
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
  },

  visibilityButton: {
    width: 48,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  visibilityButtonPressed: {
    opacity: 0.6,
  },

  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },

  forgotPasswordButtonPressed: {
    opacity: 0.6,
  },

  forgotPasswordText: {
    ...TYPOGRAPHY.action,
  },

  buttonContainer: {
    marginTop: 8,
  },
});