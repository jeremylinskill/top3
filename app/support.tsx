import AppText from '@/components/app-text';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { SUPPORT_EMAIL } from '@/constants/support';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import {
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated from 'react-native-reanimated';

export default function SupportScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const bottomScrollClearance = Math.max(40, insets.bottom + 24);
  // Use the same UI-thread scroll-linked header as the updated app screens.
  const ignoreInformationScroll = useCallback((_offsetY: number) => {}, []);
  const ignoreInformationScrolled = useCallback((_scrolled: boolean) => {}, []);
  const { scrollHandler: onInformationScroll, headerStyle: informationHeaderStyle } =
    useHomeStickyHeader(ignoreInformationScroll, ignoreInformationScrolled);

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
      edges={['left', 'right']}>
      <Reanimated.View
        pointerEvents="box-none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + SCREEN_HEADER_HEIGHT + 16,
            zIndex: 30,
          },
          informationHeaderStyle,
        ]}>
        <ScreenHeader
          showBackButton
          overlay
          featheredBackdrop
          androidStatusBarGlass
        />
      </Reanimated.View>

      <Reanimated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: SCREEN_HEADER_HEIGHT + insets.top,
            paddingBottom: bottomScrollClearance,
          },
        ]}
        onScroll={onInformationScroll}
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
            touch and we&apos;ll be happy to help.
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
      </Reanimated.ScrollView>
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
