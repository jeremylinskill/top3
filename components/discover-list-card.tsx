import AppText from '@/components/app-text';
import { TASTE_MATCH_RANK_COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
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
  const colors = useAppColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      {typeof rank === 'number' ? (
        <AppText
          variant="headline"
          tone="primary"
          style={styles.rankNumber}>
          {rank}
        </AppText>
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
                colors.border,
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
        <AppText
          variant="sectionTitle"
          tone="primary"
          numberOfLines={2}>
          {title}
        </AppText>

        <AppText
          variant="caption"
          tone="tertiary"
          style={styles.metadata}>
          {metadata}
        </AppText>
      </View>

      <Ionicons
        name="chevron-forward"
        size={24}
        color={colors.tertiaryText}
        style={styles.arrow}
      />
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
    borderRadius: RADIUS.xxl,
  },

  rankNumber: {
    width: 28,
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

  metadata: {
    marginTop: SPACING.xs,
  },

  arrow: {
    marginLeft: 10,
  },

  pressed: {
    opacity: 0.68,
  },
});
