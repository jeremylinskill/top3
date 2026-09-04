import { useAuth } from '@/hooks/use-auth';
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
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashBridge}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  splashBridge: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  splashIcon: {
    width: SPLASH_ICON_SIZE,
    height: SPLASH_ICON_SIZE,
  },
});
