import { useAuth } from '@/hooks/use-auth';
import { hasSeenWelcome } from '@/services/onboarding-service';
import { router } from 'expo-router';
import { useEffect } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    View,
} from 'react-native';

export default function IndexScreen() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    let isMounted = true;

    async function initializeApp() {
      try {
        if (isAuthenticated) {
          router.replace('/(tabs)');
          return;
        }

        const hasSeen = await hasSeenWelcome();

        if (!isMounted) {
          return;
        }

        if (hasSeen) {
          router.replace('/create-account');
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
      }
    }

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isAuthLoading]);

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