import AppText from '@/components/app-text';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
} from 'react-native';

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
  const colors = useAppColors();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor:
            colors.secondarySurface,
        },
        pressed &&
          !disabled &&
          styles.pressed,
      ]}>
      <Ionicons
        name={icon}
        size={16}
        color={
          disabled
            ? colors.disabledText
            : colors.accent
        }
      />

      <AppText
        variant="label"
        tone={
          disabled
            ? 'disabled'
            : 'accent'
        }>
        {label}
      </AppText>
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
  },

  pressed: {
    opacity: 0.7,
  },
});
