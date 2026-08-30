import EmailSignInForm from '@/components/email-sign-in-form';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInEmailScreen() {
  const {
    collection: onboardingCollection,
    isPendingPublish,
    setAuthIntent,
  } = useOnboardingCollection();

  const isReturningFromOnboarding =
    Boolean(
      onboardingCollection &&
      isPendingPublish
    );

  function handleSuccess() {
    if (isReturningFromOnboarding) {
      setAuthIntent('sign-in');
      router.replace('/');
      return;
    }

    router.replace('/(tabs)');
  }

  function handleCreateAccount() {
    if (isReturningFromOnboarding) {
      router.replace('/create-account');
      return;
    }

    router.replace('/onboarding');
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
            {isReturningFromOnboarding
              ? "Don't have an account?"
              : 'New to Top 3?'}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isReturningFromOnboarding
                ? 'Create account'
                : 'Get started'
            }
            hitSlop={8}
            onPress={handleCreateAccount}
            style={({ pressed }) => [
              styles.signUpButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.signUpButtonText}>
              {isReturningFromOnboarding
                ? 'Create one'
                : 'Get Started'}
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
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.tertiaryText,
  },

  signUpButton: {
    marginLeft: 5,
  },

  signUpButtonText: {
    ...TYPOGRAPHY.action,
  },

  pressed: {
    opacity: 0.6,
  },
});