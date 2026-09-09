import { COLORS, TASTE_MATCH_RANK_COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { LinearGradient } from 'expo-linear-gradient';
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
  rank?: number;
  reserveRankSpace?: boolean;
};

export default function DiscoverListCard({
  icon,
  title,
  metadata,
  onPress,
  accessibilityLabel,
  rank,
  reserveRankSpace = false,
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
      {typeof rank === 'number' ? (
        <Text style={styles.rankNumber}>
          {rank}
        </Text>
      ) : reserveRankSpace ? (
        <View style={styles.rankSpacer} />
      ) : null}

      {typeof rank === 'number' ? (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                TASTE_MATCH_RANK_COLORS[rank - 1] ??
                '#F3F3F3',
            },
          ]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : (
        <LinearGradient
          colors={['#00D89A', '#00D2FD']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </LinearGradient>
      )}

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

  rankNumber: {
    width: 28,
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
    transform: [{ translateX: -5 }],
  },

  rankSpacer: {
    width: 28,
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
