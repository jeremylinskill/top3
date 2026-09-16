import AppText from '@/components/app-text';
import { SPACING } from '@/constants/spacing';
import { MINIMUM_TASTE_MATCH } from '@/constants/taste-match';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

type TasteMatchBadgeProps = {
  score: number;
  sharedPickCount: number;
  minimumScore?: number;
  onPress?: () => void;
};

export default function TasteMatchBadge({
  score,
  sharedPickCount,
  minimumScore = MINIMUM_TASTE_MATCH,
  onPress,
}: TasteMatchBadgeProps) {
  const normalizedScore = Math.max(
    0,
    Math.min(100, Math.round(score))
  );

  if (normalizedScore < minimumScore) {
    return null;
  }

  const content = (
    <>
      <AppText
        variant="badgeTitle"
        tone="tasteMatch"
        numberOfLines={1}>
        Taste Match {normalizedScore}%
      </AppText>

      <AppText
        variant="badgeSubtitle"
        tone="tasteMatch"
        style={styles.sharedText}
        numberOfLines={1}>
        {sharedPickCount === 1
          ? 'You share 1 ranked pick.'
          : `You share ${sharedPickCount} ranked picks.`}
      </AppText>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.container}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        styles.pressable,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${normalizedScore}% taste match details`}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
  },

  pressable: {
    alignSelf: 'flex-start',
  },

  sharedText: {
    marginTop: 1,
  },

  pressed: {
    opacity: 0.6,
  },
});
