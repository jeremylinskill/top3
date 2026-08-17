import AuthProviderButton from '@/components/auth-provider-button';
import { signInWithEmail } from '@/services/auth-service';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    Pressable,
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
  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');
  const [showPassword, setShowPassword] =
    useState(false);
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
      const message =
        getSignInErrorMessage(error);

      if (
        !(
          error instanceof Error &&
          error.message
            .toLowerCase()
            .includes(
              'invalid login credentials'
            )
        )
      ) {
        console.error(
          'Failed to sign in:',
          error
        );
      }

      Alert.alert(
        'Unable to sign in',
        message
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
        <Text style={styles.label}>
          Password
        </Text>

        <View style={styles.passwordInputContainer}>
          <TextInput
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
      </View>

      <View style={styles.buttonContainer}>
        <AuthProviderButton
          disabled={isSubmitting}
          loading={isSubmitting}
          onPress={() => {
            void handleSubmit();
          }}
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
});
