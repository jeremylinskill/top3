import AppText from '@/components/app-text';
import PrimaryButton from '@/components/primary-button';
import { useBlock } from '@/context/block-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Image,
  StyleSheet,
  View,
} from 'react-native';

interface BlockGateProps {
  children: React.ReactNode;
}

const SPLASH_ICON_SIZE = 200;

export function BlockGate({
  children,
}: BlockGateProps) {
  const colors = useAppColors();
  const colorScheme = useColorScheme();

  const splashBackgroundColor =
    colorScheme === 'dark'
      ? '#000000'
      : '#FFFFFF';

  const {
    isLoading,
    isReady,
    hasLoadError,
    refreshBlocks,
  } = useBlock();

  if (!isReady && isLoading) {
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

  if (!isReady && hasLoadError) {
    return (
      <View
        style={[
          styles.errorState,
          {
            backgroundColor:
              colors.background,
          },
        ]}>
        <AppText
          variant="sectionTitle"
          style={styles.errorTitle}>
          Couldn’t load your account
        </AppText>

        <AppText
          variant="body"
          tone="tertiary"
          style={styles.errorText}>
          Check your connection and try again.
        </AppText>

        <PrimaryButton
          title="Try Again"
          onPress={() => {
            void refreshBlocks();
          }}
          style={styles.retryButton}
        />
      </View>
    );
  }

  if (!isReady) {
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

  errorState: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorTitle: {
    textAlign: 'center',
  },

  errorText: {
    marginTop: 8,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
});
