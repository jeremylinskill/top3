import ActionSheet from '@/components/action-sheet';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { useProfile } from '@/context/profile-context';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const isSelected = selectedValue === value;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionCard,
        isSelected && styles.optionCardSelected,
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
          <Text style={styles.optionTitle}>
            {title}
          </Text>

          <Text style={styles.optionDescription}>
            {description}
          </Text>
        </View>

        <View
          style={[
            styles.radioOuter,
            isSelected &&
              styles.radioOuterSelected,
          ]}>
          {isSelected ? (
            <View style={styles.radioInner} />
          ) : null}
        </View>
      </View>

      {details.length > 0 ? (
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>
            When your account is private
          </Text>

          {details.map((detail) => (
            <View
              key={detail}
              style={styles.detailItem}>
              <Text style={styles.detailBullet}>
                •
              </Text>

              <Text style={styles.detailText}>
                {detail}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function PrivacyScreen() {
  const { profile, updateProfile } =
    useProfile();

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
        style={styles.container}
        edges={['top', 'left', 'right']}>
        <ScreenHeader showBackButton />

        <PageHeader
          title="Privacy"
          subtitle="Choose who can see your lists."
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Account visibility
            </Text>

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
                color={COLORS.text}
              />

              <Text style={styles.savingText}>
                Updating privacy…
              </Text>
            </View>
          ) : null}
        </ScrollView>
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
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
  },

  section: {
    marginTop: SPACING.sm,
  },

  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: SPACING.md,
    fontSize: 18,
  },

  optionCard: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
  },

  optionCardSelected: {
    borderColor: COLORS.text,
    borderWidth: 2,
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

  optionTitle: {
    ...TYPOGRAPHY.headline,
    color: COLORS.text,
  },

  optionDescription: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
  },

  radioOuter: {
    width: 24,
    height: 24,
    marginTop: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: COLORS.text,
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.text,
  },

  detailsSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },

  detailsTitle: {
    ...TYPOGRAPHY.headline,
    color: COLORS.text,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
  },

  detailBullet: {
    width: 16,
    fontSize: 16,
    lineHeight: 20,
    color: COLORS.secondaryText,
  },

  detailText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.secondaryText,
  },

  savingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },

  savingText: {
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.tertiaryText,
  },

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.6,
  },
});