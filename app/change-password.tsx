import AuthProviderButton from '@/components/auth-provider-button';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import {
    signInWithEmail,
    updatePassword,
} from '@/services/auth-service';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
    useRef,
    useState,
} from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
  const { user } = useAuth();

  const newPasswordInputRef =
    useRef<TextInput>(null);
  const confirmPasswordInputRef =
    useRef<TextInput>(null);

  const [currentPassword, setCurrentPassword] =
    useState('');
  const [newPassword, setNewPassword] =
    useState('');
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');
  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);
  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);
  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);
  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);
  const [
    hasUpdatedPassword,
    setHasUpdatedPassword,
  ] = useState(false);

  function validateForm() {
    if (!user?.email) {
      Alert.alert(
        'Unable to change password',
        'No email address is available for this account.'
      );
      return false;
    }

    if (!currentPassword) {
      Alert.alert(
        'Current password required',
        'Enter your current password.'
      );
      return false;
    }

    if (!newPassword) {
      Alert.alert(
        'New password required',
        'Enter a new password.'
      );
      return false;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        'Password too short',
        'Your new password must be at least 8 characters.'
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

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'Make sure both new passwords are the same.'
      );
      return false;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        'Choose a different password',
        'Your new password must be different from your current password.'
      );
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (
      !validateForm() ||
      isSubmitting ||
      !user?.email
    ) {
      return;
    }

    try {
      setIsSubmitting(true);

      try {
        await signInWithEmail({
          email: user.email,
          password: currentPassword,
        });
      } catch (error) {
        const isInvalidCredentials =
          error instanceof Error &&
          error.message
            .toLowerCase()
            .includes(
              'invalid login credentials'
            );

        if (isInvalidCredentials) {
          Alert.alert(
            'Current password is incorrect',
            'Enter your current password and try again.'
          );
          return;
        }

        throw error;
      }

      await updatePassword(newPassword);

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
          'Failed to change password:',
          error
        );

        Alert.alert(
          'Unable to change password',
          error instanceof Error
            ? error.message
            : 'Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (hasUpdatedPassword) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom']}>
        <View style={styles.successContent}>
          <Text style={styles.successTitle}>
            Password updated
          </Text>

          <Text style={styles.successDescription}>
            Your new password is ready to use.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to settings"
            onPress={() =>
              router.replace('/settings')
            }
            style={({ pressed }) => [
              styles.returnButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.returnButtonText}>
              Return to Settings
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
      <ScreenHeader showBackButton />

      <PageHeader
        title="Change password"
        subtitle="Enter your current password, then choose a new one."
        align="center"
      />

      <View style={styles.content}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>
              Current password
            </Text>

            <View
              style={
                styles.passwordInputContainer
              }>
              <TextInput
                accessibilityLabel="Current password"
                autoCapitalize="none"
                autoComplete="password"
                autoCorrect={false}
                editable={!isSubmitting}
                onChangeText={
                  setCurrentPassword
                }
                onSubmitEditing={() =>
                  newPasswordInputRef.current?.focus()
                }
                placeholder="Enter your current password"
                placeholderTextColor="#999999"
                returnKeyType="next"
                secureTextEntry={
                  !showCurrentPassword
                }
                style={styles.passwordInput}
                textContentType="password"
                value={currentPassword}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showCurrentPassword
                    ? 'Hide current password'
                    : 'Show current password'
                }
                disabled={isSubmitting}
                hitSlop={8}
                onPress={() =>
                  setShowCurrentPassword(
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
                    showCurrentPassword
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
              New password
            </Text>

            <View
              style={
                styles.passwordInputContainer
              }>
              <TextInput
                ref={newPasswordInputRef}
                accessibilityLabel="New password"
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                editable={!isSubmitting}
                onChangeText={setNewPassword}
                onSubmitEditing={() =>
                  confirmPasswordInputRef.current?.focus()
                }
                placeholder="At least 8 characters"
                placeholderTextColor="#999999"
                returnKeyType="next"
                secureTextEntry={
                  !showNewPassword
                }
                style={styles.passwordInput}
                textContentType="newPassword"
                value={newPassword}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showNewPassword
                    ? 'Hide new password'
                    : 'Show new password'
                }
                disabled={isSubmitting}
                hitSlop={8}
                onPress={() =>
                  setShowNewPassword(
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
                    showNewPassword
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
              Confirm new password
            </Text>

            <View
              style={
                styles.passwordInputContainer
              }>
              <TextInput
                ref={confirmPasswordInputRef}
                accessibilityLabel="Confirm new password"
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
                placeholder="Enter your new password again"
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

  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  successTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  successDescription: {
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