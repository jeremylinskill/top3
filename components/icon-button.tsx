import { ReactNode } from 'react';
import {
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
}: IconButtonProps) {
  const dimension =
    ICON_BUTTON_SIZES[size];

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
          styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
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
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexShrink: 0,
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
