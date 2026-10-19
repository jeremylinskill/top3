import EmailSignUpForm from '@/components/email-sign-up-form';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { useAppColors } from '@/hooks/use-app-colors';
import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpEmailScreen() {
  const colors = useAppColors();

  function handleSuccess() {
    router.replace('/check-email');
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
            title="Create your account"
            subtitle={
              'Start discovering people who share\nyour favorite things.'
            }
            align="center"
          />

          <View style={styles.content}>
            <View style={styles.form}>
              <EmailSignUpForm
                onSuccess={handleSuccess}
              />
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  form: {
    marginTop: 28,
  },
});
