import ActionSheet from '@/components/action-sheet';
import AuthProviderButton from '@/components/auth-provider-button';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
  const [
    actionSheet,
    setActionSheet,
  ] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const isFormValid =
    Boolean(user?.email) &&
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    currentPassword !== newPassword;

  function showActionSheet(
    title: string,
    message: string
  ) {
    setActionSheet({
      title,
      message,
    });
  }

  function validateForm() {
    if (!user?.email) {
      showActionSheet(
        'Unable to change password',
        'No email address is available for this account.'
      );
      return false;
    }

    if (!currentPassword) {
      showActionSheet(
        'Current password required',
        'Enter your current password.'
      );
      return false;
    }

    if (!newPassword) {
      showActionSheet(
        'New password required',
        'Enter a new password.'
      );
      return false;
    }

    if (newPassword.length < 8) {
      showActionSheet(
        'Password too short',
        'Your new password must be at least 8 characters.'
      );
      return false;
    }

    if (!confirmPassword) {
      showActionSheet(
        'Confirm your password',
        'Enter your new password again.'
      );
      return false;
    }

    if (newPassword !== confirmPassword) {
      showActionSheet(
        'Passwords do not match',
        'Make sure both new passwords are the same.'
      );
      return false;
    }

    if (currentPassword === newPassword) {
      showActionSheet(
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
          showActionSheet(
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
        showActionSheet(
          'Choose a different password',
          'Your new password must be different from your current password.'
        );
      } else {
        console.error(
          'Failed to change password:',
          error
        );

        showActionSheet(
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
    <>
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom']}>
        <ScreenHeader showBackButton />

        <PageHeader
          title="Change password"
          subtitle={"Enter your current password,\nthen choose a new one."}
          align="center"
        />

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios'
                ? 'interactive'
                : 'on-drag'
            }
            showsVerticalScrollIndicator={false}>
            <Pressable
              onPress={Keyboard.dismiss}
              accessible={false}>
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
                      placeholder="Enter a new password"
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

                  <Text style={styles.helperText}>
                    Must be at least 8 characters.
                  </Text>
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
                        if (isFormValid && !isSubmitting) {
                          void handleSubmit();
                        }
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
              </View>
            </Pressable>
          </ScrollView>

          <View style={styles.bottomBar}>
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
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ActionSheet
        visible={actionSheet !== null}
        title={actionSheet?.title ?? ''}
        message={actionSheet?.message ?? ''}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setActionSheet(null);
            },
          },
        ]}
        onClose={() => {
          setActionSheet(null);
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

  keyboardContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 24,
    paddingBottom: 48,
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

  helperText: {
    ...TYPOGRAPHY.metadata,
    marginTop: 8,
    color: COLORS.secondaryText,
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

  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },

  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  successTitle: {
    ...TYPOGRAPHY.pageTitle,
    textAlign: 'center',
  },

  successDescription: {
    ...TYPOGRAPHY.bodyLarge,
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
    backgroundColor: COLORS.primary,
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