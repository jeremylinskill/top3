import EmailSignUpForm from '@/components/email-sign-up-form';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { router } from 'expo-router';
import {
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpEmailScreen() {
  function handleSuccess() {
    router.replace('/check-email');
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>
      <ScreenHeader showBackButton />

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
});