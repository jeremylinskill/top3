import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type DiscoverListCardProps = {
  icon: string;
  title: string;
  metadata: string;
  onPress: () => void;
  accessibilityLabel: string;
};

export default function DiscoverListCard({
  icon,
  title,
  metadata,
  onPress,
  accessibilityLabel,
}: DiscoverListCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.details}>
        <Text
          style={styles.title}
          numberOfLines={2}>
          {title}
        </Text>

        <Text style={styles.metadata}>
          {metadata}
        </Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xxl,
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 25,
  },

  details: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },

  title: {
    ...TYPOGRAPHY.sectionTitle,
  },

  metadata: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
    color: COLORS.tertiaryText,
  },

  arrow: {
    marginLeft: 10,
    fontSize: 30,
    color: COLORS.tertiaryText,
  },

  pressed: {
    opacity: 0.68,
  },
});