import PrimaryButton from '@/components/primary-button';
import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
import { useBlock } from '@/context/block-context';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface BlockGateProps {
  children: React.ReactNode;
}

const SPLASH_ICON_SIZE = 200;

export function BlockGate({
  children,
}: BlockGateProps) {
  const {
    isLoading,
    isReady,
    hasLoadError,
    refreshBlocks,
  } = useBlock();

  if (!isReady && isLoading) {
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

  if (!isReady && hasLoadError) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>
          Couldn’t load your account
        </Text>

        <Text style={styles.errorText}>
          Check your connection and try again.
        </Text>

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
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorTitle: {
    ...TYPOGRAPHY.sectionTitle,
    color: COLORS.text,
    textAlign: 'center',
  },

  errorText: {
    ...TYPOGRAPHY.body,
    marginTop: 8,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
});
