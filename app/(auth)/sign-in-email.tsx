import EmailSignInForm from '@/components/email-sign-in-form';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { router } from 'expo-router';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInEmailScreen() {
  function handleSuccess() {
    router.replace('/(tabs)');
  }

  function handleCreateAccount() {
    router.replace('/create-account');
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>
<ScreenHeader showBackButton />

      <PageHeader
        title="Welcome back"
        subtitle="Sign in to continue discovering people who share your favorite things."
        align="center"
      />

      <View style={styles.content}>
        <View style={styles.form}>
          <EmailSignInForm
            onSuccess={handleSuccess}
          />
        </View>

        <View style={styles.signUpContainer}>
          <Text style={styles.signUpPrompt}>
            Don&apos;t have an account?
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create account"
            hitSlop={8}
            onPress={handleCreateAccount}
            style={({ pressed }) => [
              styles.signUpButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.signUpButtonText}>
              Create one
            </Text>
          </Pressable>
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
    flex: 1,
    marginTop: 28,
  },

  signUpContainer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signUpPrompt: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.tertiaryText,
  },

  signUpButton: {
    marginLeft: 5,
  },

  signUpButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1573DD',
  },

  pressed: {
    opacity: 0.6,
  },
});