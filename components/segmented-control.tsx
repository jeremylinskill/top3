import AppText from '@/components/app-text';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  Pressable,
  StyleSheet,
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
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.controlSurface,
        },
      ]}>
      {options.map((option) => {
        const isActive =
          option.value === value;

        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.segment,
              isActive && {
                ...styles.activeSegment,
                backgroundColor:
                  colors.surface,
                borderColor:
                  colors.border,
              },
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
            <AppText
              variant="bodyBold"
              tone={
                isActive
                  ? 'primary'
                  : 'tertiary'
              }
              emphasis={
                isActive
                  ? 'strong'
                  : 'default'
              }>
              {option.label}

              {typeof option.count ===
              'number' ? (
                <AppText
                  variant="label"
                  tone={
                    isActive
                      ? 'secondary'
                      : 'tertiary'
                  }
                  emphasis={
                    isActive
                      ? 'strong'
                      : 'default'
                  }>
                  {' '}
                  {option.count}
                </AppText>
              ) : null}
            </AppText>
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
    borderWidth: 1,
  },

  pressed: {
    opacity: 0.68,
  },
});
