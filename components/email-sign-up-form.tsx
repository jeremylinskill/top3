import ActionSheet from '@/components/action-sheet';

import AuthProviderButton from '@/components/auth-provider-button';
import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';

import { signUpWithEmail } from '@/services/auth-service';

import {
  setAwaitingEmailVerification,
  setAwaitingEmailVerificationEmail,
} from '@/services/onboarding-service';

import { Ionicons } from '@expo/vector-icons';

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

interface EmailSignUpFormProps {
  onSuccess: () => void;
}

type ValidationSheet = {
  title: string;
  message: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function EmailSignUpForm({
  onSuccess,
}: EmailSignUpFormProps) {
  const passwordInputRef =
    useRef<TextInput>(null);

  const confirmPasswordInputRef =
    useRef<TextInput>(null);

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const isFormValid =
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const [
    validationSheet,
    setValidationSheet,
  ] = useState<ValidationSheet | null>(null);

  const [
    isNetworkErrorSheetVisible,
    setIsNetworkErrorSheetVisible,
  ] = useState(false);

  const [
    createAccountErrorMessage,
    setCreateAccountErrorMessage,
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
        message: 'Enter a password.',
      });

      return false;
    }

    if (password.length < 8) {
      setValidationSheet({
        title: 'Password too short',
        message:
          'Your password must be at least 8 characters.',
      });

      return false;
    }

    if (!confirmPassword) {
      setValidationSheet({
        title: 'Confirm your password',
        message: 'Enter your password again.',
      });

      return false;
    }

    if (password !== confirmPassword) {
      setValidationSheet({
        title: 'Passwords do not match',
        message:
          'Make sure both passwords are the same.',
      });

      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    try {
      setIsSubmitting(true);

      await signUpWithEmail({
        email: normalizedEmail,
        password,
      });

      await setAwaitingEmailVerification(
        true
      );

      await setAwaitingEmailVerificationEmail(
        normalizedEmail
      );

      onSuccess();
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
        'Failed to create account:',
        error
      );

      setCreateAccountErrorMessage(
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>

          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isSubmitting}
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
          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordInputContainer}>
            <TextInput
              ref={passwordInputRef}
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={setPassword}
              onSubmitEditing={() =>
                confirmPasswordInputRef.current?.focus()
              }
              placeholder="Enter a password"
              placeholderTextColor="#999999"
              returnKeyType="next"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              textContentType="newPassword"
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

          <Text style={styles.passwordHint}>
            Must be at least 8 characters
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Confirm password
          </Text>

          <View style={styles.passwordInputContainer}>
            <TextInput
              ref={confirmPasswordInputRef}
              accessibilityLabel="Confirm password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={setConfirmPassword}
              onSubmitEditing={handleSubmit}
              placeholder="Enter your password again"
              placeholderTextColor="#999999"
              returnKeyType="done"
              secureTextEntry={!showConfirmPassword}
              style={styles.passwordInput}
              textContentType="newPassword"
              value={confirmPassword}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showConfirmPassword
                  ? 'Hide confirmed password'
                  : 'Show confirmed password'
              }
              disabled={isSubmitting}
              hitSlop={8}
              onPress={() =>
                setShowConfirmPassword(
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
                  showConfirmPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={22}
                color="#666666"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <AuthProviderButton
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
            onPress={handleSubmit}
            title="Create Account"
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
        visible={createAccountErrorMessage !== null}
        title="Unable to create account"
        message={createAccountErrorMessage ?? ''}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setCreateAccountErrorMessage(null);
            },
          },
        ]}
        onClose={() => {
          setCreateAccountErrorMessage(null);
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

  passwordHint: {
    ...TYPOGRAPHY.metadata,
    marginTop: 6,
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

  buttonContainer: {
    marginTop: 8,
  },
});