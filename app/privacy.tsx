import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import PageHeader from '@/components/page-header';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useProfile } from '@/context/profile-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated from 'react-native-reanimated';

type VisibilityOption = 'public' | 'private';

type VisibilityCardProps = {
  value: VisibilityOption;
  selectedValue: VisibilityOption;
  title: string;
  description: string;
  details?: string[];
  disabled?: boolean;
  onSelect: (value: VisibilityOption) => void;
};

function VisibilityCard({
  value,
  selectedValue,
  title,
  description,
  details = [],
  disabled = false,
  onSelect,
}: VisibilityCardProps) {
  const colors = useAppColors();
  const isSelected = selectedValue === value;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionCard,
        {
          backgroundColor: colors.surface,
        },
        pressed &&
          !disabled &&
          styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={() => onSelect(value)}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{
        selected: isSelected,
        disabled,
      }}
      accessibilityLabel={title}
      accessibilityHint={description}>
      <View style={styles.optionHeader}>
        <View style={styles.optionContent}>
          <AppText variant="headline">
            {title}
          </AppText>

          <AppText
            variant="label"
            tone="tertiary"
            emphasis="regular"
            style={styles.optionDescription}>
            {description}
          </AppText>
        </View>

        <View
          style={[
            styles.radioOuter,
            {
              borderColor: isSelected
                ? colors.text
                : colors.border,
            },
          ]}>
          {isSelected ? (
            <View
              style={[
                styles.radioInner,
                {
                  backgroundColor: colors.text,
                },
              ]}
            />
          ) : null}
        </View>
      </View>

      {details.length > 0 ? (
        <View
          style={[
            styles.detailsSection,
            {
              borderTopColor: colors.border,
            },
          ]}>
          <AppText variant="headline">
            When your account is private
          </AppText>

          {details.map((detail) => (
            <View
              key={detail}
              style={styles.detailItem}>
              <AppText
                variant="bodyLarge"
                tone="secondary"
                style={styles.detailBullet}>
                •
              </AppText>

              <AppText
                variant="label"
                tone="secondary"
                emphasis="regular"
                style={styles.detailText}>
                {detail}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function PrivacyScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const bottomScrollClearance = Math.max(40, insets.bottom + 24);
  const { profile, updateProfile } =
    useProfile();

  // Use the same UI-thread scroll-linked header as the updated app screens.
  const ignoreInformationScroll = useCallback((_offsetY: number) => {}, []);
  const ignoreInformationScrolled = useCallback((_scrolled: boolean) => {}, []);
  const { scrollHandler: onInformationScroll, headerStyle: informationHeaderStyle } =
    useHomeStickyHeader(ignoreInformationScroll, ignoreInformationScrolled);

  const [selectedVisibility, setSelectedVisibility] =
    useState<VisibilityOption>(
      profile.visibility
    );

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    isUpdateErrorSheetVisible,
    setIsUpdateErrorSheetVisible,
  ] = useState(false);

  async function updateVisibility(
    visibility: VisibilityOption
  ) {
    if (
      isSaving ||
      visibility === selectedVisibility
    ) {
      return;
    }

    const previousVisibility =
      selectedVisibility;

    setSelectedVisibility(visibility);
    setIsSaving(true);

    try {
      await updateProfile({
        visibility,
      });
    } catch (error) {
      console.error(
        'Failed to update privacy setting:',
        error
      );

      setSelectedVisibility(
        previousVisibility
      );

      setIsUpdateErrorSheetVisible(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
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
              title="Privacy"
              subtitle="Choose who can see your lists."
            />
          </View>

          <View style={styles.section}>
            <AppText
              variant="sectionTitle"
              style={styles.sectionTitle}>
              Account visibility
            </AppText>

            <View
              accessibilityRole="radiogroup">
              <VisibilityCard
                value="public"
                selectedValue={
                  selectedVisibility
                }
                title="Public account"
                description="Anyone can view your profile and published lists."
                disabled={isSaving}
                onSelect={updateVisibility}
              />

              <VisibilityCard
                value="private"
                selectedValue={
                  selectedVisibility
                }
                title="Private account"
                description="Only approved followers can view your published lists."
                details={[
                  'People must request to follow you.',
                  'You can approve or decline each request.',
                  'Your lists remain hidden from non-followers.',
                  'Your profile can still appear in search.',
                ]}
                disabled={isSaving}
                onSelect={updateVisibility}
              />
            </View>
          </View>

          {isSaving ? (
            <View style={styles.savingState}>
              <ActivityIndicator
                size="small"
                color={colors.text}
              />

              <AppText
                variant="label"
                tone="tertiary"
                emphasis="regular"
                style={styles.savingText}>
                Updating privacy…
              </AppText>
            </View>
          ) : null}
        </Reanimated.ScrollView>
      </SafeAreaView>

      <ActionSheet
        visible={isUpdateErrorSheetVisible}
        title="Unable to update privacy"
        message="Please try again."
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setIsUpdateErrorSheetVisible(
                false
              );
            },
          },
        ]}
        onClose={() => {
          setIsUpdateErrorSheetVisible(false);
        }}
      />
    </>
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

  section: {
    marginTop: SPACING.sm,
  },

  sectionTitle: {
    marginBottom: SPACING.md,
  },

  optionCard: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
  },

  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  optionContent: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.md,
  },

  optionDescription: {
    marginTop: 4,
  },

  radioOuter: {
    width: 24,
    height: 24,
    marginTop: 1,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  detailsSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
  },

  detailBullet: {
    width: 16,
    lineHeight: 20,
  },

  detailText: {
    flex: 1,
  },

  savingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },

  savingText: {
    marginLeft: SPACING.sm,
  },

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.6,
  },
});
