import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
  accessibilityLabel?: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedControlOption<T>[];
  onChange: (value: T) => void;
};

export default function SegmentedControl<
  T extends string,
>({
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive =
          option.value === value;

        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.segment,
              isActive &&
                styles.activeSegment,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              onChange(option.value)
            }
            accessibilityRole="button"
            accessibilityState={{
              selected: isActive,
            }}
            accessibilityLabel={
              option.accessibilityLabel ??
              option.label
            }>
            <Text
              style={[
                styles.label,
                isActive &&
                  styles.activeLabel,
              ]}>
              {option.label}

              {typeof option.count ===
              'number' ? (
                <Text
                  style={[
                    styles.count,
                    isActive &&
                      styles.activeCount,
                  ]}>
                  {' '}
                  {option.count}
                </Text>
              ) : null}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 12,
  },

  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },

  activeSegment: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },

  label: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.tertiaryText,
  },

  activeLabel: {
    color: COLORS.text,
    fontWeight: '700',
  },

  count: {
    ...TYPOGRAPHY.label,
    color: '#999999',
  },

  activeCount: {
    color: '#555555',
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.68,
  },
});