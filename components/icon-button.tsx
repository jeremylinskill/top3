import { ReactNode, useRef } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

export const ICON_BUTTON_SIZES = {
  small: 32,
  compact: 36,
  navigation: 44,
} as const;

export type IconButtonSize =
  keyof typeof ICON_BUTTON_SIZES;

type IconButtonProps = {
  children: ReactNode;
  onPress: (
    event: GestureResponderEvent
  ) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  selected?: boolean;
  size?: IconButtonSize;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  // Optional for shared header buttons; other buttons retain original behaviour.
  pressFeedback?: 'scale';
};

export default function IconButton({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  selected,
  size = 'compact',
  backgroundColor,
  style,
  hitSlop = 8,
  pressFeedback,
}: IconButtonProps) {
  const dimension =
    ICON_BUTTON_SIZES[size];
  const pressScale = useRef(new Animated.Value(1)).current;

  function animatePress(toValue: number, duration: number) {
    Animated.timing(pressScale, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        style,
        {
          width: dimension,
          height: dimension,
          borderRadius:
            dimension / 2,
        },
        backgroundColor
          ? { backgroundColor }
          : null,
        pressed &&
          !disabled &&
          !pressFeedback &&
          styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      onPressIn={
        pressFeedback && !disabled
          ? () => animatePress(1.18, 95)
          : undefined
      }
      onPressOut={
        pressFeedback && !disabled
          ? () => animatePress(1, 170)
          : undefined
      }
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel
      }
      accessibilityHint={
        accessibilityHint
      }
      accessibilityState={{
        disabled,
        ...(typeof selected ===
        'boolean'
          ? { selected }
          : {}),
      }}>
      {pressFeedback ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.animatedContent,
            { transform: [{ scale: pressScale }] },
          ]}>
          {children}
        </Animated.View>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  animatedContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.65,
  },

  disabled: {
    opacity: 0.5,
  },
});
