import AuthProviderButton from '@/components/auth-provider-button';
import { signUpWithEmail } from '@/services/auth-service';
import { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface EmailSignUpFormProps {
  onSuccess: () => void;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function EmailSignUpForm({
  onSuccess,
}: EmailSignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  function validateForm() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      Alert.alert(
        'Email required',
        'Enter your email address.'
      );

      return false;
    }

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert(
        'Invalid email',
        'Enter a valid email address.'
      );

      return false;
    }

    if (!password) {
      Alert.alert(
        'Password required',
        'Enter a password.'
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
        'Enter your password again.'
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
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      await signUpWithEmail({
        email: email.trim().toLowerCase(),
        password,
      });

      onSuccess();
    } catch (error) {
      console.error(
        'Failed to create account:',
        error
      );

      Alert.alert(
        'Unable to create account',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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

        <TextInput
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          editable={!isSubmitting}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor="#999999"
          returnKeyType="next"
          secureTextEntry
          style={styles.input}
          textContentType="newPassword"
          value={password}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Confirm password
        </Text>

        <TextInput
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
          secureTextEntry
          style={styles.input}
          textContentType="newPassword"
          value={confirmPassword}
        />
      </View>

      <View style={styles.buttonContainer}>
        <AuthProviderButton
          disabled={isSubmitting}
          loading={isSubmitting}
          onPress={handleSubmit}
          title="Create Account"
          variant="primary"
        />
      </View>
    </View>
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
});