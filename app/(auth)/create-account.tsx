import EmailAuthButton from '@/components/email-auth-button';
import GoogleAuthButton from '@/components/google-auth-button';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import {
  signInWithApple,
  signInWithGoogle,
} from '@/services/auth-service';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function CreateAccountScreen() {
  const {
    collection: onboardingCollection,
    prepareAuthHandoff,
  } = useOnboardingCollection();


  const isSavingOnboardingCollection =
    Boolean(onboardingCollection);


  async function prepareSignUpIntent() {
    if (isSavingOnboardingCollection) {
      await prepareAuthHandoff('sign-up');
    }
  }


  async function handleAppleSignUp() {
    try {
      await prepareSignUpIntent();

      await signInWithApple();
      router.replace('/');
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }


      console.error(
        'Apple sign-in failed:',
        error
      );


      Alert.alert(
        'Unable to continue with Apple',
        'Please try again.'
      );
    }
  }


  async function handleGoogleSignUp() {
    try {
      await prepareSignUpIntent();

      const result = await signInWithGoogle();


      if (!result) {
        return;
      }


      router.replace('/');
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.message.includes('cancel') ||
          error.message.includes('cancelled') ||
          error.message.includes('canceled')
        )
      ) {
        return;
      }


      console.error(
        'Google sign-in failed:',
        error
      );


      Alert.alert(
        'Unable to continue with Google',
        'Please try again.'
      );
    }
  }


  async function handleEmailSignUp() {
    try {
      await prepareSignUpIntent();
      router.push('/sign-up-email');
    } catch (error) {
      console.error(
        'Failed to prepare email sign-up:',
        error
      );


      Alert.alert(
        'Unable to continue',
        'Please try again.'
      );
    }
  }


  function handleSignIn() {
    if (isSavingOnboardingCollection) {
      router.push({
        pathname: '/sign-in',
        params: {
          source: 'onboarding-publish',
        },
      });
      return;
    }


    router.push('/sign-in');
  }


  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>
      <ScreenHeader />


      <PageHeader
        title="Save your Top 3"
        subtitle={
          'Create your account to publish your list\nand start building your taste profile.'
        }
        align="center"
      />


      <View style={styles.content}>
        <View style={styles.options}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication
                .AppleAuthenticationButtonType.CONTINUE
            }
            buttonStyle={
              AppleAuthentication
                .AppleAuthenticationButtonStyle.WHITE_OUTLINE
            }
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleAppleSignUp}
          />


          <GoogleAuthButton
            onPress={handleGoogleSignUp}
          />


          <View style={styles.divider}>
            <View style={styles.dividerLine} />


            <Text style={styles.dividerText}>
              OR
            </Text>


            <View style={styles.dividerLine} />
          </View>


          <EmailAuthButton
            onPress={handleEmailSignUp}
          />


          <Text style={styles.ageNotice}>
  {'By continuing, you confirm that you’re\nat least 13 years old.'}
</Text>
        </View>


        <View style={styles.signInContainer}>
          <Text style={styles.signInPrompt}>
            Already have an account?
          </Text>


          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            hitSlop={8}
            onPress={handleSignIn}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.signInButtonText}>
              Sign In
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


  options: {
    marginTop: 28,
    gap: 14,
  },


  appleButton: {
    width: '100%',
    height: 54,
  },


  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },


  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },


  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: COLORS.tertiaryText,
  },


 ageNotice: {
  marginTop: 2,
  paddingHorizontal: 12,
  fontSize: 16,
  lineHeight: 22,
  color: COLORS.tertiaryText,
  textAlign: 'center',
},


  signInContainer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },


  signInPrompt: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.tertiaryText,
  },


  signInButton: {
    marginLeft: 5,
  },


  signInButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1573DD',
  },


  pressed: {
    opacity: 0.6,
  },
});