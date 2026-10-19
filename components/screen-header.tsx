import IconButton from '@/components/icon-button';
import AppText from '@/components/app-text';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, type ComponentProps } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const SCREEN_HEADER_HEIGHT = 44;

const HEADER_BACKGROUND_OPACITY = 0.92;

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string | null;
  showBackButton?: boolean;
  rightIconName?: IoniconName;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  secondaryRightIconName?: IoniconName;
  onSecondaryRightPress?: () => void;
  secondaryRightAccessibilityLabel?: string;
  // Feed only: draw the header over the scrolling content.
  overlay?: boolean;
  // Feed only: roll the header away after the scroll threshold.
  compact?: boolean;
  // Allow a back-navigation header to roll away when explicitly requested.
  collapseWithBackButton?: boolean;
};

function withOpacity(color: string, alpha: number) {
  const hex = color.trim().replace(/^#/, '');

  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const [r, g, b] = hex.split('').map((part) =>
      parseInt(part + part, 16)
    );
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}

export default function ScreenHeader({
  title,
  subtitle,
  showBackButton = false,
  rightIconName,
  onRightPress,
  rightAccessibilityLabel = 'Open menu',
  secondaryRightIconName,
  onSecondaryRightPress,
  secondaryRightAccessibilityLabel = 'Open secondary action',
  overlay = false,
  compact = false,
  collapseWithBackButton = false,
}: ScreenHeaderProps) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const visibility = useRef(new Animated.Value(1)).current;

  // Keep titled and back-navigation headers permanently visible.
  const isCollapsed = compact && !title && (!showBackButton || collapseWithBackButton);

  useEffect(() => {
    Animated.timing(visibility, {
      toValue: isCollapsed ? 0 : 1,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isCollapsed, visibility]);

  const showRightAction = Boolean(rightIconName) && Boolean(onRightPress);
  const showSecondaryRightAction =
    Boolean(secondaryRightIconName) && Boolean(onSecondaryRightPress);

  return (
    <>
      {/* Android draws behind the status bar. Match its background to
          the translucent header without moving the wordmark. */}
      {overlay && Platform.OS === 'android' && insets.top > 0 ? (
        <View
          testID="AndroidStatusBarBackdrop"
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: withOpacity(
              colors.background,
              HEADER_BACKGROUND_OPACITY
            ),
            zIndex: 10,
          }}
        />
      ) : null}
      <Animated.View
      pointerEvents={isCollapsed ? 'none' : 'auto'}
      style={[
        styles.header,
        overlay && styles.overlay,
        {
          backgroundColor: overlay
            ? withOpacity(colors.background, HEADER_BACKGROUND_OPACITY)
            : colors.background,
        },
        // Absolute children of SafeAreaView do not inherit its top padding.
        // The Feed uses SafeAreaView with the top edge enabled, so position
        // the overlay beneath the system status bar explicitly.
        overlay && {
          top: insets.top,
          opacity: visibility,
          transform: [
            {
              translateY: visibility.interpolate({
                inputRange: [0, 1],
                outputRange: [-SCREEN_HEADER_HEIGHT, 0],
              }),
            },
          ],
        },
      ]}>
      <Animated.View
        style={[
          styles.topBar,
          !overlay && {
            height: visibility.interpolate({
              inputRange: [0, 1],
              outputRange: [0, SCREEN_HEADER_HEIGHT],
            }),
            opacity: visibility,
            transform: [
              {
                translateY: visibility.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-12, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.sideActions}>
          {showBackButton ? (
            <IconButton
              size="navigation"
              onPress={() => router.back()}
              accessibilityLabel="Go back">
              <Ionicons
                name="chevron-back"
                size={28}
                color={colors.text}
              />
            </IconButton>
          ) : (
            <View style={styles.sideSlot} />
          )}
          <View style={styles.sideSlot} />
        </View>

        <AppText variant="brand" style={styles.brand}>
          <Text style={styles.brandTop}>Top</Text>
          <Text style={styles.brandThree}>3</Text>
        </AppText>

        <View style={styles.sideActions}>
          {showSecondaryRightAction ? (
            <IconButton
              size="navigation"
              onPress={() => onSecondaryRightPress?.()}
              accessibilityLabel={secondaryRightAccessibilityLabel}>
              <Ionicons
                name={secondaryRightIconName}
                size={24}
                color={colors.text}
              />
            </IconButton>
          ) : (
            <View style={styles.sideSlot} />
          )}

          {showRightAction ? (
            <IconButton
              size="navigation"
              onPress={() => onRightPress?.()}
              accessibilityLabel={rightAccessibilityLabel}>
              <Ionicons
                name={rightIconName}
                size={26}
                color={colors.text}
              />
            </IconButton>
          ) : (
            <View style={styles.sideSlot} />
          )}
        </View>
      </Animated.View>

      {title ? (
        <View style={styles.titleArea}>
          <AppText variant="screenTitle">{title}</AppText>
          {subtitle ? (
            <AppText variant="subtitle" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {},
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 0,
  },
  topBar: {
    height: SCREEN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  sideActions: {
    width: 88,
    height: SCREEN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideSlot: {
    width: 44,
    height: SCREEN_HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
  },
  brandTop: { fontWeight: '700' },
  brandThree: { fontWeight: '400' },
  titleArea: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 10,
  },
  subtitle: { marginTop: SPACING.xs },
});
