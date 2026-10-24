import AppText from '@/components/app-text';
import EmailSignInForm from '@/components/email-sign-in-form';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { router } from 'expo-router';
import {
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInEmailScreen() {
  const colors = useAppColors();

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
      router.replace('/feed');
      return;
    }

    router.replace('/feed');
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
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'bottom']}>
      <ScreenHeader showBackButton />

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
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
          <AppText
            variant="bodyLarge"
            tone="tertiary">
            {isReturningFromOnboarding
              ? "Don't have an account?"
              : 'New to Top 3?'}
          </AppText>

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
            <AppText variant="action">
              {isReturningFromOnboarding
                ? 'Create one'
                : 'Get Started'}
            </AppText>
          </Pressable>
        </View>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  keyboardArea: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  form: {
    flexGrow: 1,
    marginTop: 28,
  },

  signUpContainer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signUpButton: {
    marginLeft: 5,
  },

  pressed: {
    opacity: 0.6,
  },
});
