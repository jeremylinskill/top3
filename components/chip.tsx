import {
    Pressable,
    StyleSheet,
    Text,
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selectedChip,
        pressed && styles.pressedChip,
      ]}>
      <Text
        style={[
          styles.label,
          selected && styles.selectedLabel,
        ]}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 14,
  },

  selectedChip: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },

  pressedChip: {
    opacity: 0.68,
  },

  label: {
    fontSize: 16,
    lineHeight: 22,
    color: '#222222',
  },

  selectedLabel: {
    color: '#FFFFFF',
  },
});