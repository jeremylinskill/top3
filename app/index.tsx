import {
    hasSeenWelcome,
    resetWelcomeStatus,
} from '@/services/onboarding-service';
import { router } from 'expo-router';
import {
    useEffect,
    useState,
} from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    View,
} from 'react-native';

export default function IndexScreen() {
  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initializeApp() {
      try {
        // TEMPORARY:
        // Reset the welcome status so the
        // Welcome screen appears every launch.
        await resetWelcomeStatus();

        const hasSeen =
          await hasSeenWelcome();

        if (!isMounted) {
          return;
        }

        if (hasSeen) {
          router.replace('/(tabs)');
        } else {
          router.replace('/welcome');
        }
      } catch (error) {
        console.error(
          'Failed to initialize app:',
          error
        );

        if (isMounted) {
          router.replace('/welcome');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color="#222222"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
});