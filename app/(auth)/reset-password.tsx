import AuthProviderButton from '@/components/auth-provider-button';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
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
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const url = Linking.useLinkingURL();

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
        console.error(
          'Failed to prepare password recovery session:',
          error
        );

        if (isMounted) {
          setErrorMessage(
            error instanceof Error
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
      Alert.alert(
        'Password required',
        'Enter a new password.'
      );
      return false;
    }

    if (password.length < 8) {
      Alert.alert(
        'Password too short',
        'Your password must be at least 8 characters.'
      );
      return false;
    }

    if (!confirmPassword) {
      Alert.alert(
        'Confirm your password',
        'Enter your new password again.'
      );
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'Make sure both passwords are the same.'
      );
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
        Alert.alert(
          'Choose a different password',
          'Your new password must be different from your current password.'
        );
      } else {
        console.error(
          'Failed to update password:',
          error
        );

        Alert.alert(
          'Unable to update password',
          error instanceof Error
            ? error.message
            : 'Please try again.'
        );
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
        style={styles.container}
        edges={['top', 'bottom']}>
        <View style={styles.loadingContent}>
          <ActivityIndicator
            size="large"
            color="#222222"
          />

          <Text style={styles.loadingTitle}>
            Opening your reset link…
          </Text>

          <Text style={styles.loadingDescription}>
            We&apos;re preparing your account so you can choose a new password.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom']}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>
            Unable to reset password
          </Text>

          <Text style={styles.loadingDescription}>
            {errorMessage}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to sign in"
            onPress={() =>
              router.replace('/sign-in-email')
            }
            style={({ pressed }) => [
              styles.returnButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.returnButtonText}>
              Return to Sign In
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (hasUpdatedPassword) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom']}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>
            Password updated
          </Text>

          <Text style={styles.loadingDescription}>
            Your new password is ready to use.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to sign in"
            onPress={() => {
              void returnToSignIn();
            }}
            style={({ pressed }) => [
              styles.returnButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.returnButtonText}>
              Return to Sign In
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
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
            <Text style={styles.label}>
              New password
            </Text>

            <View
              style={
                styles.passwordInputContainer
              }>
              <TextInput
                accessibilityLabel="New password"
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                editable={!isSubmitting}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
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
                  color="#666666"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Confirm password
            </Text>

            <View
              style={
                styles.passwordInputContainer
              }>
              <TextInput
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
                placeholderTextColor="#999999"
                returnKeyType="done"
                secureTextEntry={
                  !showConfirmPassword
                }
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
                  color="#666666"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <AuthProviderButton
              disabled={isSubmitting}
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
    fontSize: 16,
    lineHeight: 22,
    color: '#222222',
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
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  loadingDescription: {
    marginTop: 12,
    maxWidth: 340,
    fontSize: 16,
    lineHeight: 24,
    color: '#666666',
    textAlign: 'center',
  },

  returnButton: {
    width: '100%',
    minHeight: 54,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#1573DD',
  },

  returnButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  pressed: {
    opacity: 0.8,
  },
});