import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const splashIcon = require('@/assets/images/splash-icon.png');
const splashWordmark = require('@/assets/images/splash-wordmark.png');

export default function LoadingScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.iconContainer}>
        <Image
          source={splashIcon}
          style={styles.icon}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      <View style={styles.wordmarkContainer} pointerEvents="none">
        <Image
          source={splashWordmark}
          style={styles.wordmark}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /*
   * The icon container fills the screen so the icon remains truly centred
   * vertically and horizontally, independent of the wordmark below.
   */
  iconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /*
   * Recommended displayed size:
   * 160 × 160 points.
   *
   * For a sharp @3x iPhone asset, splash-icon.png can be approximately
   * 480 × 480 px while still displaying at 160 × 160 points here.
   */
  icon: {
    width: 160,
    height: 160,
  },

  /*
   * The wordmark sits near the bottom of the safe area rather than being
   * tied to a specific device height.
   */
  wordmarkContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: 'center',
  },

  /*
   * Recommended displayed area:
   * 200 × 48 points.
   *
   * Keep transparent padding in the PNG to a minimum. resizeMode="contain"
   * preserves the wordmark's aspect ratio.
   */
  wordmark: {
    width: 200,
    height: 48,
  },
});