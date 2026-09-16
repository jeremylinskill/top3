import AppText from '@/components/app-text';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  Pressable,
  StyleSheet,
} from 'react-native';

type ChipProps = {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
};

export default function Chip({
  label,
  icon,
  selected = false,
  onPress,
}: ChipProps) {
  const colors = useAppColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? colors.primary
            : colors.surface,
          borderColor: selected
            ? colors.primary
            : colors.border,
        },
        pressed && styles.pressedChip,
      ]}>
      <AppText
        variant="bodyLarge"
        tone={
          selected
            ? 'onPrimary'
            : 'primary'
        }>
        {icon ? `${icon} ` : ''}
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 14,
  },

  pressedChip: {
    opacity: 0.68,
  },
});
