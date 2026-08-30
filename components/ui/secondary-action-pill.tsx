import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

type SecondaryActionPillProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function SecondaryActionPill({
  icon,
  label,
  onPress,
  disabled = false,
}: SecondaryActionPillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed &&
          !disabled &&
          styles.pressed,
      ]}>
      <Ionicons
        name={icon}
        size={16}
        color={
          disabled
            ? '#9B9B9B'
            : COLORS.accent
        }
      />

      <Text
        style={[
          styles.label,
          disabled &&
            styles.disabledLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F1F1',
  },

  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.accent,
  },

  disabledLabel: {
    color: '#9B9B9B',
  },

  pressed: {
    opacity: 0.7,
  },
});