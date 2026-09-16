import AppText from '@/components/app-text';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

type IoniconName =
  ComponentProps<typeof Ionicons>['name'];

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string | null;
  showBackButton?: boolean;
  rightIconName?: IoniconName;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  secondaryRightIconName?: IoniconName;
  onSecondaryRightPress?: () => void;
  secondaryRightAccessibilityLabel?: string;
};

export default function ScreenHeader({
  title,
  subtitle,
  showBackButton = false,
  rightIconName,
  onRightPress,
  rightAccessibilityLabel = 'Open menu',
  secondaryRightIconName,
  onSecondaryRightPress,
  secondaryRightAccessibilityLabel = 'Open secondary action',
}: ScreenHeaderProps) {
  const colors = useAppColors();

  const showRightAction =
    Boolean(rightIconName) &&
    Boolean(onRightPress);

  const showSecondaryRightAction =
    Boolean(secondaryRightIconName) &&
    Boolean(onSecondaryRightPress);

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}>
      <View style={styles.topBar}>
        <View style={styles.sideActions}>
          {showBackButton ? (
            <Pressable
              style={({ pressed }) => [
                styles.sideSlot,
                pressed && styles.pressed,
              ]}
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <Ionicons
                name="chevron-back"
                size={28}
                color={colors.text}
              />
            </Pressable>
          ) : (
            <View style={styles.sideSlot} />
          )}

          <View style={styles.sideSlot} />
        </View>

        <AppText
          variant="brand"
          style={styles.brand}>
          Top 3
        </AppText>

        <View style={styles.sideActions}>
          {showSecondaryRightAction ? (
            <Pressable
              style={({ pressed }) => [
                styles.sideSlot,
                pressed && styles.pressed,
              ]}
              onPress={onSecondaryRightPress}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                secondaryRightAccessibilityLabel
              }>
              <Ionicons
                name={secondaryRightIconName}
                size={24}
                color={colors.text}
              />
            </Pressable>
          ) : (
            <View style={styles.sideSlot} />
          )}

          {showRightAction ? (
            <Pressable
              style={({ pressed }) => [
                styles.sideSlot,
                pressed && styles.pressed,
              ]}
              onPress={onRightPress}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                rightAccessibilityLabel
              }>
              <Ionicons
                name={rightIconName}
                size={26}
                color={colors.text}
              />
            </Pressable>
          ) : (
            <View style={styles.sideSlot} />
          )}
        </View>
      </View>

      {title ? (
        <View style={styles.titleArea}>
          <AppText variant="screenTitle">
            {title}
          </AppText>

          {subtitle ? (
            <AppText
              variant="subtitle"
              style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },

  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },

  sideActions: {
    width: 88,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },

  sideSlot: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brand: {
    flex: 1,
    textAlign: 'center',
  },

  titleArea: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 10,
  },

  subtitle: {
    marginTop: SPACING.xs,
  },

  pressed: {
    opacity: 0.55,
  },
});
