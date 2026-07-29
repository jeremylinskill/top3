import PrimaryButton from '@/components/primary-button';
import {
    markWelcomeAsSeen,
} from '@/services/onboarding-service';
import { router } from 'expo-router';
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  async function handleGetStarted() {
    try {
      await markWelcomeAsSeen();

      /*
       * Temporary destination.
       *
       * Story 002 will replace this with
       * /create-account.
       */
      router.replace('/create-account');
    } catch (error) {
      console.error(
        'Failed to complete welcome flow:',
        error
      );

      Alert.alert(
        'Something went wrong',
        'Please try again.'
      );
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.heroContainer}>
  <Text style={styles.logo}>
    Top3
  </Text>

  <Image
    source={require('@/assets/images/top3-mark.png')}
    style={styles.logoImage}
    resizeMode="contain"
  />

  <Text style={styles.headline}>
    Discover your people.
  </Text>

  <Text style={styles.body}>
    Everyone has favorite things.
    {'\n'}
    See who shares yours.
  </Text>
</View>

        <PrimaryButton
          title="Get Started"
          onPress={handleGetStarted}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 40,
  },

  heroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoImage: {
    width: 112,
    height: 112,
    marginBottom: 40,
  },

  logo: {
    fontSize: 36,
    lineHeight: 34,
    fontWeight: '700',
    color: '#444444',
    textAlign: 'center',
    marginBottom: 10,
  },

  headline: {
    fontSize: 24,
    lineHeight: 42,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  body: {
    marginTop: 20,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },
});