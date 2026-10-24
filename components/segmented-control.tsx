import AppText from '@/components/app-text';
import { useAppColors } from '@/hooks/use-app-colors';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  count?: number | string;
  accessibilityLabel?: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedControlOption<T>[];
  onChange: (value: T) => void;
};

function SegmentOptionLabel<T extends string>({
  option,
  index,
  indicatorIndex,
}: {
  option: SegmentedControlOption<T>;
  index: number;
  indicatorIndex: SharedValue<number>;
}) {
  const inactiveStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(indicatorIndex.value - index)),
  }));
  const activeStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - Math.abs(indicatorIndex.value - index)),
  }));

  return (
    <View style={styles.labelStack} pointerEvents="none">
      {/* Let the wider, bold text determine the label's natural width.
          Android otherwise clips its final glyph during the crossfade. */}
      <Animated.View
        style={activeStyle}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants">
        <AppText variant="bodyBold" tone="primary" emphasis="strong">
          {option.label}
          {option.count !== undefined ? (
            <AppText variant="label" tone="secondary" emphasis="strong">
              {' '}
              {option.count}
            </AppText>
          ) : null}
        </AppText>
      </Animated.View>
      <Animated.View
        style={[styles.inactiveLabelLayer, inactiveStyle]}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants">
        <AppText variant="bodyBold" tone="tertiary" emphasis="default">
          {option.label}
          {option.count !== undefined ? (
            <AppText variant="label" tone="tertiary" emphasis="default">
              {' '}
              {option.count}
            </AppText>
          ) : null}
        </AppText>
      </Animated.View>
    </View>
  );
}

export default function SegmentedControl<
  T extends string,
>({
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useAppColors();
  const [controlWidth, setControlWidth] = useState(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const segmentWidth =
    options.length > 0
      ? Math.max(0, (controlWidth - 8) / options.length)
      : 0;
  const indicatorIndex = useSharedValue(selectedIndex);

  useEffect(() => {
    indicatorIndex.value = withTiming(selectedIndex, {
      duration: 280,
      easing: Easing.inOut(Easing.quad),
    });
  }, [indicatorIndex, selectedIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: indicatorIndex.value * segmentWidth },
    ],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.controlSurface,
        },
      ]}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (Math.abs(nextWidth - controlWidth) > 0.5) {
          setControlWidth(nextWidth);
        }
      }}>
      {controlWidth > 0 && options.length > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.selectedIndicator,
            {
              width: segmentWidth,
              backgroundColor: colors.surface,
            },
            indicatorStyle,
          ]}
        />
      ) : null}
      {options.map((option, index) => {
        const isActive =
          option.value === value;

        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.segment,
              isActive && controlWidth <= 0 && {
                backgroundColor: colors.surface,
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
            <SegmentOptionLabel
              option={option}
              index={index}
              indicatorIndex={indicatorIndex}
            />
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

  selectedIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 9,
  },

  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },

  labelStack: {
    alignItems: 'center',
    justifyContent: 'center',
    // A little optical room for Android font glyph overhang.
    paddingHorizontal: 4,
    maxWidth: '100%',
  },

  inactiveLabelLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.68,
  },
});
