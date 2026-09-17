import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Redirect } from 'expo-router';
import {
  Image,
  StyleSheet,
  View,
} from 'react-native';

interface AuthGateProps {
  children: React.ReactNode;
}

const SPLASH_ICON_SIZE = 200;

export function AuthGate({
  children,
}: AuthGateProps) {
  const {
    isLoading,
    isAuthenticated,
  } = useAuth();

  const colorScheme = useColorScheme();

  const splashBackgroundColor =
    colorScheme === 'dark'
      ? '#000000'
      : '#FFFFFF';

  if (isLoading) {
    return (
      <View
        style={[
          styles.splashBridge,
          {
            backgroundColor:
              splashBackgroundColor,
          },
        ]}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  splashBridge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  splashIcon: {
    width: SPLASH_ICON_SIZE,
    height: SPLASH_ICON_SIZE,
  },
});
