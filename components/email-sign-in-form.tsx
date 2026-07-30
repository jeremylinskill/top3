import AuthProviderButton from '@/components/auth-provider-button';
import { signInWithEmail } from '@/services/auth-service';
import { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface EmailSignInFormProps {
  onSuccess: () => void;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function EmailSignInForm({
  onSuccess,
}: EmailSignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] =
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
        'Enter your password.'
      );

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

      await signInWithEmail({
        email: normalizedEmail,
        password,
      });

      onSuccess();
    } catch (error) {
      console.error(
        'Failed to sign in:',
        error
      );

      Alert.alert(
        'Unable to sign in',
        error instanceof Error
          ? error.message
          : 'Please check your email and password and try again.'
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
          autoComplete="password"
          autoCorrect={false}
          editable={!isSubmitting}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
          placeholder="Enter your password"
          placeholderTextColor="#999999"
          returnKeyType="done"
          secureTextEntry
          style={styles.input}
          textContentType="password"
          value={password}
        />
      </View>

      <View style={styles.buttonContainer}>
        <AuthProviderButton
          disabled={isSubmitting}
          loading={isSubmitting}
          onPress={handleSubmit}
          title="Sign In"
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