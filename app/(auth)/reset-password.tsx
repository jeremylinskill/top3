import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import AuthProviderButton from '@/components/auth-provider-button';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { TEXT_STYLES } from '@/constants/typography';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  setSessionFromUrl,
  signOut,
  updatePassword,
} from '@/services/auth-service';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const colors = useAppColors();
  const url = Linking.useLinkingURL();

  const confirmPasswordInputRef =
    useRef<TextInput>(null);

  const [password, setPassword] =
    useState('');
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);
  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);
  const [
    isPreparingRecovery,
    setIsPreparingRecovery,
  ] = useState(true);
  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);
  const [
    hasUpdatedPassword,
    setHasUpdatedPassword,
  ] = useState(false);
  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    validationSheet,
    setValidationSheet,
  ] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const [
    updateErrorSheet,
    setUpdateErrorSheet,
  ] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const isFormValid =
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  useEffect(() => {
    if (!url) {
      return;
    }

    let isMounted = true;

    async function prepareRecoverySession() {
      try {
        const session =
          await setSessionFromUrl(url!);

        if (!session) {
          throw new Error(
            'The password reset link did not contain a valid session.'
          );
        }

        if (isMounted) {
          setErrorMessage(null);
          setIsPreparingRecovery(false);
        }
      } catch (error) {
        const recoveryErrorMessage =
          error instanceof Error
            ? error.message.trim().toLowerCase()
            : '';

        const isInvalidRecoveryLink =
          recoveryErrorMessage.includes(
            'password reset link did not contain a valid session'
          );

        if (!isInvalidRecoveryLink) {
          console.error(
            'Failed to prepare password recovery session:',
            error
          );
        }

        if (isMounted) {
          setErrorMessage(
            isInvalidRecoveryLink
              ? 'This password reset link is invalid or has expired. Request a new link and try again.'
              : error instanceof Error
                ? error.message
                : 'The password reset link could not be completed.'
          );
          setIsPreparingRecovery(false);
        }
      }
    }

    void prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [url]);

  function validateForm() {
    if (!password) {
      setValidationSheet({
        title: 'Password required',
        message: 'Enter a new password.',
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
        message: 'Enter your new password again.',
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
    if (
      !validateForm() ||
      isSubmitting
    ) {
      return;
    }

    try {
      setIsSubmitting(true);

      await updatePassword(password);

      setHasUpdatedPassword(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
              .trim()
              .toLowerCase()
          : '';

      const isSamePasswordError =
        errorMessage.includes(
          'new password should be different from the old password'
        );

      if (isSamePasswordError) {
        setUpdateErrorSheet({
          title: 'Choose a different password',
          message:
            'Your new password must be different from your current password.',
        });
      } else {
        console.error(
          'Failed to update password:',
          error
        );

        setUpdateErrorSheet({
          title: 'Unable to update password',
          message:
            error instanceof Error
              ? error.message
              : 'Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function returnToSignIn() {
    try {
      await signOut();
    } catch (error) {
      console.warn(
        'Password was updated, but sign out failed:',
        error
      );
    }

    router.replace('/sign-in-email');
  }

  if (isPreparingRecovery) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={['top', 'bottom']}>
        <View style={styles.loadingContent}>
          <ActivityIndicator
            size="large"
            color={colors.text}
          />

          <AppText
            variant="pageTitle"
            style={styles.loadingTitle}>
            Opening your reset link…
          </AppText>

          <AppText
            variant="bodyLarge"
            style={styles.loadingDescription}>
            We&apos;re preparing your account so you can choose a new password.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={['top', 'bottom']}>
        <View style={styles.loadingContent}>
          <AppText
            variant="pageTitle"
            style={styles.loadingTitle}>
            Unable to reset password
          </AppText>

          <AppText
            variant="bodyLarge"
            style={styles.loadingDescription}>
            {errorMessage}
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Request a new password reset link"
            onPress={() =>
              router.replace('/forgot-password')
            }
            style={({ pressed }) => [
              styles.returnButton,
              {
                backgroundColor:
                  colors.primary,
              },
              pressed && styles.pressed,
            ]}>
            <AppText
              variant="bodyLarge"
              tone="onPrimary"
              emphasis="strong">
              Request a New Link
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (hasUpdatedPassword) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={['top', 'bottom']}>
        <View style={styles.loadingContent}>
          <AppText
            variant="pageTitle"
            style={styles.loadingTitle}>
            Password updated
          </AppText>

          <AppText
            variant="bodyLarge"
            style={styles.loadingDescription}>
            Your new password is ready to use.
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to sign in"
            onPress={() => {
              void returnToSignIn();
            }}
            style={({ pressed }) => [
              styles.returnButton,
              {
                backgroundColor:
                  colors.primary,
              },
              pressed && styles.pressed,
            ]}>
            <AppText
              variant="bodyLarge"
              tone="onPrimary"
              emphasis="strong">
              Return to Sign In
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
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
          title="Choose a new password"
          subtitle="Enter a new password for your Top 3 account."
          align="center"
        />

        <View style={styles.content}>
          <View style={styles.form}>
          <View style={styles.field}>
            <AppText
              variant="formLabel"
              style={styles.label}>
              New password
            </AppText>

            <View
              style={[
                styles.passwordInputContainer,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}>
              <TextInput
                accessibilityLabel="New password"
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                editable={!isSubmitting}
                onChangeText={setPassword}
                onSubmitEditing={() =>
                  confirmPasswordInputRef.current?.focus()
                }
                placeholder="Enter a new password"
                placeholderTextColor={
                  colors.tertiaryText
                }
                returnKeyType="next"
                secureTextEntry={!showPassword}
                style={[
                  styles.passwordInput,
                  {
                    color: colors.text,
                  },
                ]}
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
                    styles
                      .visibilityButtonPressed,
                ]}>
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={22}
                  color={colors.secondaryText}
                />
              </Pressable>
            </View>

            <AppText
              variant="metadata"
              tone="secondary"
              style={styles.helperText}>
              Must be at least 8 characters.
            </AppText>
          </View>

          <View style={styles.field}>
            <AppText
              variant="formLabel"
              style={styles.label}>
              Confirm password
            </AppText>

            <View
              style={[
                styles.passwordInputContainer,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}>
              <TextInput
                ref={confirmPasswordInputRef}
                accessibilityLabel="Confirm password"
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                editable={!isSubmitting}
                onChangeText={
                  setConfirmPassword
                }
                onSubmitEditing={() => {
                  void handleSubmit();
                }}
                placeholder="Enter your password again"
                placeholderTextColor={
                  colors.tertiaryText
                }
                returnKeyType="done"
                secureTextEntry={
                  !showConfirmPassword
                }
                style={[
                  styles.passwordInput,
                  {
                    color: colors.text,
                  },
                ]}
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
                    styles
                      .visibilityButtonPressed,
                ]}>
                <Ionicons
                  name={
                    showConfirmPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={22}
                  color={colors.secondaryText}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <AuthProviderButton
              disabled={!isFormValid || isSubmitting}
              loading={isSubmitting}
              onPress={() => {
                void handleSubmit();
              }}
              title="Update Password"
              variant="primary"
            />
          </View>
          </View>
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
        visible={Boolean(updateErrorSheet)}
        title={updateErrorSheet?.title ?? ''}
        message={updateErrorSheet?.message ?? ''}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setUpdateErrorSheet(null);
            },
          },
        ]}
        onClose={() => {
          setUpdateErrorSheet(null);
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

  form: {
    marginTop: 28,
  },

  field: {
    marginBottom: 20,
  },

  label: {
    marginBottom: 8,
  },

  passwordInputContainer: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },

  passwordInput: {
    flex: 1,
    minHeight: 54,
    paddingLeft: 16,
    paddingRight: 8,
    ...TEXT_STYLES.bodyLarge,
  },

  helperText: {
    marginTop: 8,
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

  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingTitle: {
    marginTop: 24,
    textAlign: 'center',
  },

  loadingDescription: {
    marginTop: 12,
    maxWidth: 340,
    textAlign: 'center',
  },

  returnButton: {
    width: '100%',
    minHeight: 54,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  pressed: {
    opacity: 0.8,
  },
});