import AppText from '@/components/app-text';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { SUPPORT_EMAIL } from '@/constants/support';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import {
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SupportScreen() {
  const colors = useAppColors();

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
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Support"
        subtitle="Get help with Top3."
      />

      <View style={styles.content}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
            },
          ]}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  colors.background,
              },
            ]}>
            <Ionicons
              name="help-circle-outline"
              size={30}
              color={colors.text}
            />
          </View>

          <AppText
            variant="sectionTitle"
            style={styles.title}>
            Need help?
          </AppText>

          <AppText
            variant="body"
            tone="tertiary"
            style={styles.message}>
            If you have a question, need help with
            Top3, or want to report a problem, get in
            touch and we'll be happy to help.
          </AppText>

          <View style={styles.buttonContainer}>
            <PrimaryButton
              title="Contact Support"
              onPress={() => {
                void contactSupport();
              }}
            />
          </View>

          <AppText
            variant="metadata"
            style={styles.email}>
            {SUPPORT_EMAIL}
          </AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: SPACING.xl,
  },

  card: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 28,
    borderRadius: RADIUS.xl,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: SPACING.lg,
    textAlign: 'center',
  },

  message: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  buttonContainer: {
    alignSelf: 'stretch',
    marginTop: SPACING.xl,
  },

  email: {
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});
