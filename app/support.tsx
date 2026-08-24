import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { SUPPORT_EMAIL } from '@/constants/support';
import { TYPOGRAPHY } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SupportScreen() {
  async function contactSupport() {
    const subject = encodeURIComponent(
      'Top3 Support'
    );

    const mailtoUrl =
      `mailto:${SUPPORT_EMAIL}?subject=${subject}`;

    await Linking.openURL(mailtoUrl);
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Support"
        subtitle="Get help with Top3."
      />

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="help-circle-outline"
              size={30}
              color={COLORS.text}
            />
          </View>

          <Text style={styles.title}>
            Need help?
          </Text>

          <Text style={styles.message}>
            If you have a question, need help with
            Top3, or want to report a problem, get in
            touch and we'll be happy to help.
          </Text>

          <View style={styles.buttonContainer}>
            <PrimaryButton
              title="Contact Support"
              onPress={() => {
                void contactSupport();
              }}
            />
          </View>

          <Text style={styles.email}>
            {SUPPORT_EMAIL}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: SPACING.xl,
  },

  card: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 28,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  title: {
    ...TYPOGRAPHY.sectionTitle,
    marginTop: SPACING.lg,
    color: COLORS.text,
    textAlign: 'center',
  },

  message: {
    marginTop: SPACING.sm,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  buttonContainer: {
    alignSelf: 'stretch',
    marginTop: SPACING.xl,
  },

  email: {
    marginTop: SPACING.md,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },
});