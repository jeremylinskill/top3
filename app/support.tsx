import AppText from '@/components/app-text';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { SUPPORT_EMAIL } from '@/constants/support';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SupportScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const bottomScrollClearance = Math.max(40, insets.bottom + 24);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollOffset = useRef(0);

  function handleScroll(offsetY: number) {
    const y = Math.max(0, offsetY);
    const delta = y - lastScrollOffset.current;

    if (y < 20) {
      setHeaderHidden(false);
    } else if (delta >= 7 && y > 36) {
      setHeaderHidden(true);
    } else if (delta <= -7) {
      setHeaderHidden(false);
    }

    if (Math.abs(delta) >= 7 || y < 20) {
      lastScrollOffset.current = y;
    }
  }

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
      <ScreenHeader
        showBackButton
        overlay
        compact={headerHidden}
        collapseWithBackButton
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomScrollClearance },
        ]}
        onScroll={(event) =>
          handleScroll(event.nativeEvent.contentOffset.y)
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeaderContainer}>
          <PageHeader
            title="Support"
            subtitle="Get help with Top3."
          />
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SCREEN_HEADER_HEIGHT,
    paddingBottom: 40,
  },

  pageHeaderContainer: {
    marginHorizontal: -SPACING.xl,
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
