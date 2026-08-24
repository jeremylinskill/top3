import { COLORS } from '@/constants/colors';
import { SPACING } from '@/constants/spacing';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
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
  const showRightAction =
    Boolean(rightIconName) &&
    Boolean(onRightPress);

  const showSecondaryRightAction =
    Boolean(secondaryRightIconName) &&
    Boolean(onSecondaryRightPress);

  return (
    <View style={styles.header}>
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
                color={COLORS.text}
              />
            </Pressable>
          ) : (
            <View style={styles.sideSlot} />
          )}

          <View style={styles.sideSlot} />
        </View>

        <Text style={styles.brand}>Top 3</Text>

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
                color={COLORS.text}
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
                color={COLORS.text}
              />
            </Pressable>
          ) : (
            <View style={styles.sideSlot} />
          )}
        </View>
      </View>

      {title ? (
        <View style={styles.titleArea}>
          <Text style={styles.title}>{title}</Text>

          {subtitle ? (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.background,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },

  titleArea: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 10,
  },

  title: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    color: COLORS.text,
  },

  subtitle: {
    marginTop: SPACING.xs,
    fontSize: 14,
    color: COLORS.tertiaryText,
    lineHeight: 18,
  },

  pressed: {
    opacity: 0.55,
  },
});