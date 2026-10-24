import IconButton from '@/components/icon-button';
import AppText from '@/components/app-text';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { SharedValue } from 'react-native-reanimated';
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

const HEADER_BACKGROUND_OPACITY = 0.5;

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string | null;
  // Opt-in: use the top bar for a modal title instead of the Top3 wordmark.
  centerTitle?: string;
  showBackButton?: boolean;
  // Opt-in: let modal drill-downs handle Back without leaving their route.
  onBackPress?: () => void;
  backAccessibilityLabel?: string;
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
  // Legacy input still accepted by existing screens; circles are now
  // displayed consistently regardless of scroll offset.
  scrolled?: boolean;
  // All shared header actions use the approved bottom-nav-inspired glass.
  // The standard variant remains available for deliberate exceptions.
  floatingCircleStyle?: 'standard' | 'tab-bar';
  // Accepted for compatibility; circle styling no longer fades by scroll.
  floatingCircleScrollY?: SharedValue<number>;
  // 0..SCREEN_HEADER_HEIGHT pixels, controlled by the scroll gesture.
  scrollProgress?: Animated.Value | ReturnType<typeof Animated.diffClamp>;
  // Home-only iOS treatment; other screens retain their current header.
  featheredBackdrop?: boolean;
  // Android pilot: opt in to scroll-linked status-bar translucency.
  androidStatusBarGlass?: boolean;
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

/** Decorative glass circle; stays inside the existing accessible IconButton. */
function HeaderActionCircle({
  background,
  isDark,
  variant = 'standard',
}: {
  background: string;
  isDark: boolean;
  variant?: 'standard' | 'tab-bar';
}) {
  const circle = (
    <View pointerEvents="none" style={styles.actionCircle}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={55}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: withOpacity(
              variant === 'tab-bar'
                ? (isDark ? '#17171b' : '#ffffff')
                : background,
              variant === 'tab-bar'
                ? (Platform.OS === 'ios' ? 0.78 : 0.9)
                : (Platform.OS === 'ios' ? 0.38 : 0.85)
            ),
          },
        ]}
      />
      {variant === 'standard' ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: withOpacity(isDark ? '#ffffff' : '#000000', 0.17),
              borderRadius: 22,
            },
          ]}
        />
      ) : null}
    </View>
  );

  // The frosted-glass treatment and soft shadow remain visible for the
  // entire time the ScreenHeader is onscreen, including at scroll position 0.
  return variant === 'tab-bar' ? (
    <View pointerEvents="none" style={styles.profileCircleShadow}>
      {circle}
    </View>
  ) : circle;
}

/**
 * iOS Home only: a stationary frosted surface from the top of the screen,
 * past the wordmark, then fades inside the initial pre-feed spacing.
 *
 * Expo BlurView has no native gradient-mask prop. Use one mild 14-intensity
 * core and four short decreasing-intensity bands; a real LinearGradient fades
 * the 50% tint to transparent across the same region. No extra native package.
 * Decorative and non-touchable, so the header buttons retain their hit areas.
 */
const HEADER_FEATHER_BAND_HEIGHT = 4;
const HEADER_FEATHER_INTENSITIES = [10, 7, 4, 2] as const;

function FeatheredHeaderBackdrop({
  statusBarHeight,
  background,
  isDark,
}: {
  statusBarHeight: number;
  background: string;
  isDark: boolean;
}) {
  const coreHeight = statusBarHeight + SCREEN_HEADER_HEIGHT;
  const fadeHeight = HEADER_FEATHER_BAND_HEIGHT * HEADER_FEATHER_INTENSITIES.length;
  const fullHeight = coreHeight + fadeHeight;

  return (
    <View
      pointerEvents="none"
      style={[styles.featheredBackdrop, { height: fullHeight }]}>
      <BlurView
        pointerEvents="none"
        tint={isDark ? 'dark' : 'light'}
        intensity={14}
        style={[styles.featheredBlurCore, { height: coreHeight }]}
      />
      {HEADER_FEATHER_INTENSITIES.map((intensity, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[
            styles.featherBand,
            {
              top: coreHeight + index * HEADER_FEATHER_BAND_HEIGHT,
              height: HEADER_FEATHER_BAND_HEIGHT,
            },
          ]}>
          <BlurView
            pointerEvents="none"
            tint={isDark ? 'dark' : 'light'}
            intensity={intensity}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      ))}
      <LinearGradient
        pointerEvents="none"
        colors={[
          withOpacity(background, 0.5),
          withOpacity(background, 0.5),
          withOpacity(background, 0.35),
          withOpacity(background, 0.12),
          withOpacity(background, 0),
        ]}
        locations={[
          0,
          coreHeight / fullHeight,
          (coreHeight + 4) / fullHeight,
          (coreHeight + 10) / fullHeight,
          1,
        ]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

/**
 * Android edge-to-edge pilot: translucent status-bar + header backdrop that
 * travels with the screen's Reanimated header wrapper. Uses only RN views;
 * it does not mount iOS-only/native blur in the older Android dev client.
 * A short 16pt opacity feather softens the lower edge without overlaying
 * the starting content. The entire decorative surface ignores touch.
 */
function AndroidHeaderGlass({
  statusBarHeight,
  background,
}: {
  statusBarHeight: number;
  background: string;
}) {
  const coreHeight = statusBarHeight + SCREEN_HEADER_HEIGHT;
  const featherOpacities = [0.35, 0.23, 0.12, 0.04] as const;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.androidGlassBackdrop,
        { height: coreHeight + featherOpacities.length * 4 },
      ]}>
      <View
        style={[
          styles.androidGlassCore,
          {
            // On Android the system status bar is transparent. Start the
            // header tint *below* its icons, not at y=0.
            top: statusBarHeight,
            height: SCREEN_HEADER_HEIGHT,
            backgroundColor: withOpacity(background, HEADER_BACKGROUND_OPACITY),
          },
        ]}
      />
      {featherOpacities.map((opacity, index) => (
        <View
          key={index}
          style={[
            styles.androidGlassFeatherBand,
            {
              top: coreHeight + index * 4,
              backgroundColor: withOpacity(background, opacity),
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function ScreenHeader({
  title,
  subtitle,
  centerTitle,
  showBackButton = false,
  onBackPress,
  backAccessibilityLabel = 'Go back',
  rightIconName,
  onRightPress,
  rightAccessibilityLabel = 'Open menu',
  secondaryRightIconName,
  onSecondaryRightPress,
  secondaryRightAccessibilityLabel = 'Open secondary action',
  overlay = false,
  compact = false,
  floatingCircleStyle = 'tab-bar',
  scrollProgress,
  featheredBackdrop = false,
  androidStatusBarGlass = false,
  collapseWithBackButton = false,
}: ScreenHeaderProps) {
  const colors = useAppColors();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const visibility = useRef(new Animated.Value(1)).current;

  // Scroll-linked overlay headers bypass the old 210 ms show/hide toggle.
  // All other headers retain their current behaviour.
  const linkedProgress = overlay ? scrollProgress : undefined;
  const isCollapsed =
    !linkedProgress && compact && !title &&
    (!showBackButton || collapseWithBackButton);

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
      {/* No fixed Android status-bar overlay: let scrolling content
          show through the transparent native system-bar region. */}
      {overlay && Platform.OS === 'android' && androidStatusBarGlass ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              zIndex: 9,
              // The status-bar surface must move and fade with the wordmark,
              // rather than leaving a stationary translucent strip behind.
              opacity: linkedProgress
                ? linkedProgress.interpolate({
                    inputRange: [0, SCREEN_HEADER_HEIGHT],
                    outputRange: [1, 0],
                    extrapolate: 'clamp',
                  })
                : 1,
              transform: [{
                translateY: linkedProgress
                  ? linkedProgress.interpolate({
                      inputRange: [0, SCREEN_HEADER_HEIGHT],
                      outputRange: [0, -SCREEN_HEADER_HEIGHT],
                      extrapolate: 'clamp',
                    })
                  : 0,
              }],
            },
          ]}>
          <AndroidHeaderGlass
            statusBarHeight={insets.top}
            background={colors.background}
          />
        </Animated.View>
      ) : null}
      {overlay && Platform.OS === 'ios' && featheredBackdrop ? (
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            zIndex: 9,
            // Keep the glass behind the wordmark, not stationary over content
            // after the wordmark has moved away. A native scroll driver makes
            // this transition track the gesture instead of the JS event loop.
            opacity: linkedProgress
              ? linkedProgress.interpolate({
                  inputRange: [0, SCREEN_HEADER_HEIGHT],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                })
              : 1,
            transform: [{
              translateY: linkedProgress
                ? linkedProgress.interpolate({
                    inputRange: [0, SCREEN_HEADER_HEIGHT],
                    outputRange: [0, -SCREEN_HEADER_HEIGHT],
                    extrapolate: 'clamp',
                  })
                : 0,
            }],
          },
        ]}>
        <FeatheredHeaderBackdrop
          statusBarHeight={insets.top}
          background={colors.background}
          isDark={isDark}
        />
      </Animated.View>
    ) : null}
    <Animated.View
      pointerEvents={isCollapsed ? 'none' : 'auto'}
      style={[
        styles.header,
        overlay && styles.overlay,
        {
          backgroundColor: overlay
            ? (featheredBackdrop && Platform.OS === 'ios') ||
              (androidStatusBarGlass && Platform.OS === 'android')
              ? 'transparent'
              : withOpacity(colors.background, HEADER_BACKGROUND_OPACITY)
            : colors.background,
        },
        // Absolute children of SafeAreaView do not inherit its top padding.
        // The Feed uses SafeAreaView with the top edge enabled, so position
        // the overlay beneath the system status bar explicitly.
        overlay && {
          top: insets.top,
          opacity: linkedProgress
            ? linkedProgress.interpolate({
                inputRange: [0, SCREEN_HEADER_HEIGHT],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              })
            : visibility,
          transform: [
            {
              translateY: linkedProgress
                ? linkedProgress.interpolate({
                    inputRange: [0, SCREEN_HEADER_HEIGHT],
                    outputRange: [0, -SCREEN_HEADER_HEIGHT],
                    extrapolate: 'clamp',
                  })
                : visibility.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-SCREEN_HEADER_HEIGHT, 0],
                  }),
            },
          ],
        },
      ]}>
      {overlay && Platform.OS === 'ios' && !featheredBackdrop ? (
        <BlurView
          pointerEvents="none"
          tint={isDark ? 'dark' : 'light'}
          intensity={14}
          style={styles.floatingHeaderBlur}
        />
      ) : null}
      <Animated.View
        style={[
          styles.topBar,
          styles.cardAlignedTopBar,
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
        <View style={[styles.sideActions, centerTitle && styles.singleActionSide]}>
          {showBackButton ? (
            <IconButton
              size="navigation"
              pressFeedback="scale"
              onPress={onBackPress ?? (() => router.back())}
              accessibilityLabel={backAccessibilityLabel}>
              <HeaderActionCircle
                background={colors.background}
                isDark={isDark}
                variant={floatingCircleStyle}
              />
              <Ionicons
                name="chevron-back"
                size={28}
                color={colors.text}
                style={styles.backChevron}
              />
            </IconButton>
          ) : (
            <View style={styles.sideSlot} />
          )}
          {!centerTitle ? <View style={styles.sideSlot} /> : null}
        </View>

        {centerTitle ? (
          <AppText
            variant="sectionTitle"
            numberOfLines={1}
            style={styles.centerTitle}>
            {centerTitle}
          </AppText>
        ) : (
          <AppText variant="brand" style={styles.brand}>
            <Text style={styles.brandTop}>Top</Text>
            <Text style={styles.brandThree}>3</Text>
          </AppText>
        )}

        <View style={[styles.sideActions, centerTitle && styles.singleActionSide]}>
          {showSecondaryRightAction ? (
            <IconButton
              size="navigation"
              pressFeedback="scale"
              onPress={() => onSecondaryRightPress?.()}
              accessibilityLabel={secondaryRightAccessibilityLabel}>
              <HeaderActionCircle
                background={colors.background}
                isDark={isDark}
                variant={floatingCircleStyle}
              />
              <Ionicons
                name={secondaryRightIconName}
                size={24}
                color={colors.text}
              />
            </IconButton>
          ) : !centerTitle ? (
            <View style={styles.sideSlot} />
          ) : null}

          {showRightAction ? (
            <IconButton
              size="navigation"
              pressFeedback="scale"
              onPress={() => onRightPress?.()}
              accessibilityLabel={rightAccessibilityLabel}>
              <HeaderActionCircle
                background={colors.background}
                isDark={isDark}
                variant={floatingCircleStyle}
              />
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
  androidGlassBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9,
    elevation: 0,
    overflow: 'hidden',
  },
  androidGlassCore: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  androidGlassFeatherBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
  },
  featheredBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9,
    elevation: 0,
    overflow: 'hidden',
  },
  featheredBlurCore: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  featherBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  floatingHeaderBlur: {
    ...StyleSheet.absoluteFillObject,
    height: SCREEN_HEADER_HEIGHT,
  },
  actionCircle: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    overflow: 'hidden',
  },
  profileCircleShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    // Scaled down from the floating tab bar's 0.13 / 16 / 4 shadow.
    shadowColor: '#000000',
    shadowOpacity: 0.11,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardAlignedTopBar: {
    // Match the shared card gutter, measured at the outside of the 44px circle.
    paddingHorizontal: 20,
    // Keep the floating-glass shadow un-clipped above scrolling content.
    overflow: 'visible',
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
  singleActionSide: {
    width: 44,
  },
  centerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  backChevron: {
    // Ionicons chevron-back looks slightly right-heavy at its nominal centre.
    transform: [{ translateX: -2 }],
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
