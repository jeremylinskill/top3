import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import * as Application from 'expo-application';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const version =
    Application.nativeApplicationVersion ??
    '0.1.0';

  const buildNumber =
    Application.nativeBuildVersion ??
    'Development';

  const environment = __DEV__
    ? 'Development'
    : 'Production';

  const currentYear = new Date().getFullYear();

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
            accessibilityLabel="Top 3 app icon"
          />

          <Text style={styles.appName}>
            Top 3
          </Text>

          <View style={styles.betaBadge}>
            <Text style={styles.betaBadgeText}>
              Beta
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Version
            </Text>

            <Text style={styles.infoValue}>
              {version}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Build
            </Text>

            <Text style={styles.infoValue}>
              {buildNumber}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Environment
            </Text>

            <Text style={styles.infoValue}>
              {environment}
            </Text>
          </View>
        </View>

        <View style={styles.attribution}>
          <Text style={styles.attributionTitle}>
            Designed and developed by
          </Text>

          <Text style={styles.attributionName}>
            Jeremy Linskill
          </Text>

          <Text style={styles.copyright}>
            © {currentYear} Top 3
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: 40,
  },

  hero: {
    alignItems: 'center',
  },

  appIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
  },

  appName: {
    ...TYPOGRAPHY.pageTitle,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },

  betaBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  betaBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.secondaryText,
  },

  infoCard: {
    marginTop: 32,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },

  infoRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  infoLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.secondaryText,
  },

  infoValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    textAlign: 'right',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: SPACING.lg,
    backgroundColor: COLORS.border,
  },

  attribution: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 48,
  },

  attributionTitle: {
    ...TYPOGRAPHY.label,
    fontWeight: '400',
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  attributionName: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 4,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },

  copyright: {
    ...TYPOGRAPHY.metadata,
    marginTop: SPACING.lg,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },
});