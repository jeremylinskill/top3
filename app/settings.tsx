import ActionSheet from '@/components/action-sheet';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { useProfile } from '@/context/profile-context';
import { useAuth } from '@/hooks/use-auth';
import {
  getExistingPushToken,
  registerForPushNotifications,
} from '@/lib/notifications';
import { deleteAccount } from '@/lib/supabase/account';
import {
  deletePushToken,
  isPushTokenRegistered,
  upsertPushToken,
} from '@/lib/supabase/push-tokens';
import {
  getPushNotificationsEnabled,
  resetWelcomeStatus,
  setPushNotificationsEnabled,
} from '@/services/onboarding-service';
import { clearRecentSearches } from '@/services/recent-search-service';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [
    isDeletingAccount,
    setIsDeletingAccount,
  ] = useState(false);

  const [
    isSignOutSheetVisible,
    setIsSignOutSheetVisible,
  ] = useState(false);

  const [
    isDeleteAccountSheetVisible,
    setIsDeleteAccountSheetVisible,
  ] = useState(false);

  const [
    errorSheet,
    setErrorSheet,
  ] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const [
    isPushEnabled,
    setIsPushEnabled,
  ] = useState(false);

  const [
    isPushUpdating,
    setIsPushUpdating,
  ] = useState(false);

  const refreshPushState =
    useCallback(async () => {
      try {
        if (!user?.id) {
          setIsPushEnabled(false);
          return;
        }

        const pushNotificationsEnabled =
          await getPushNotificationsEnabled(
            user.id
          );

        if (!pushNotificationsEnabled) {
          setIsPushEnabled(false);
          return;
        }

        const expoPushToken =
          await getExistingPushToken();

        if (!expoPushToken) {
          setIsPushEnabled(false);
          return;
        }

        const isRegistered =
          await isPushTokenRegistered(
            expoPushToken
          );

        setIsPushEnabled(isRegistered);
      } catch (error) {
        console.error(
          'Failed to load push notification status:',
          error
        );
      }
    }, [user?.id]);

  useEffect(() => {
    void refreshPushState();

    const subscription =
      AppState.addEventListener(
        'change',
        (nextState) => {
          if (nextState === 'active') {
            void refreshPushState();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [refreshPushState]);

  async function handlePushToggle(
    enabled: boolean
  ) {
    if (
      isPushUpdating ||
      !user?.id
    ) {
      return;
    }

    setIsPushUpdating(true);

    try {
      if (!enabled) {
        const expoPushToken =
          await getExistingPushToken();

        if (expoPushToken) {
          await deletePushToken(
            expoPushToken
          );
        }

        await setPushNotificationsEnabled(
          user.id,
          false
        );

        setIsPushEnabled(false);
        return;
      }

      const {
        token: expoPushToken,
      } =
        await registerForPushNotifications();

      if (!expoPushToken) {
        await setPushNotificationsEnabled(
          user.id,
          false
        );

        setIsPushEnabled(false);

        setErrorSheet({
          title: 'Notifications Are Off',
          message:
            'Enable notifications for Top 3 in your iPhone Settings, then return here and turn notifications on.',
        });

        return;
      }

      if (
        Platform.OS !== 'ios' &&
        Platform.OS !== 'android'
      ) {
        return;
      }

      await upsertPushToken({
        userId: user.id,
        expoPushToken,
        platform: Platform.OS,
      });

      await setPushNotificationsEnabled(
        user.id,
        true
      );

      setIsPushEnabled(true);
    } catch (error) {
      console.error(
        'Failed to update push notifications:',
        error
      );

      setErrorSheet({
        title: 'Unable to Update Notifications',
        message:
          'Something went wrong while updating your notification settings. Please try again.',
      });
    } finally {
      setIsPushUpdating(false);
    }
  }

  const canChangePassword =
    user?.identities?.some(
      (identity) =>
        identity.provider === 'email'
    ) ?? false;

  function openEditProfile() {
    router.push('/edit-profile');
  }

  function openPrivacy() {
    router.push('/privacy');
  }

  function openBlockedUsers() {
    router.push('/blocked-users');
  }

  function openChangePassword() {
    router.push('/change-password');
  }

  function openAbout() {
    router.push('/about');
  }

  function openSupport() {
    router.push('/support');
  }

  function openPrivacyPolicy() {
    router.push('/privacy-policy');
  }

  function openTermsOfUse() {
    router.push('/terms-of-use');
  }

  function openCommunityStandards() {
    router.push('/community-standards');
  }

  function openModeration() {
    router.push('/moderation');
  }

  function confirmSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSignOutSheetVisible(true);
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error) {
      console.error(
        'Failed to sign out:',
        error
      );

      setErrorSheet({
        title: 'Unable to Sign Out',
        message:
          'Something went wrong while signing you out. Please try again.',
      });
    } finally {
      setIsSigningOut(false);
    }
  }

  function confirmDeleteAccount() {
    if (
      isDeletingAccount ||
      isSigningOut
    ) {
      return;
    }

    setIsDeleteAccountSheetVisible(true);
  }

  async function handleDeleteAccount() {
    if (
      isDeletingAccount ||
      isSigningOut
    ) {
      return;
    }

    setIsDeletingAccount(true);

    const deletingUserId = user?.id ?? null;

    try {
      await deleteAccount();

      if (deletingUserId) {
        await clearRecentSearches(
          deletingUserId
        );
      }

      await resetWelcomeStatus();

      try {
        await signOut();
      } catch (signOutError) {
        console.warn(
          'Account was deleted, but local sign out failed:',
          signOutError
        );
      }

      router.replace('/onboarding');
    } catch (error) {
      console.error(
        'Failed to delete account:',
        error
      );

      setErrorSheet({
        title: 'Unable to Delete Account',
        message:
          'Something went wrong while deleting your account. Please try again.',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Settings"
        subtitle="Manage your account and app preferences."
      />

      <ActionSheet
        visible={isSignOutSheetVisible}
        title="Sign out?"
        message="You will need to sign in again to access your Top 3 account."
        actions={[
          {
            label: 'Sign Out',
            variant: 'destructive',
            onPress: () => {
              setIsSignOutSheetVisible(false);
              void handleSignOut();
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: () => {
              setIsSignOutSheetVisible(false);
            },
          },
        ]}
        onClose={() => {
          setIsSignOutSheetVisible(false);
        }}
      />

      <ActionSheet
        visible={isDeleteAccountSheetVisible}
        title="Delete your account?"
        message="This permanently deletes your Top 3 account, profile, lists, comments, likes, follows, and other account data. This cannot be undone."
        actions={[
          {
            label: 'Delete Account',
            variant: 'destructive',
            onPress: () => {
              setIsDeleteAccountSheetVisible(false);
              void handleDeleteAccount();
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: () => {
              setIsDeleteAccountSheetVisible(false);
            },
          },
        ]}
        onClose={() => {
          setIsDeleteAccountSheetVisible(false);
        }}
      />

      <ActionSheet
        visible={errorSheet !== null}
        title={errorSheet?.title ?? ''}
        message={errorSheet?.message ?? ''}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setErrorSheet(null);
            },
          },
        ]}
        onClose={() => {
          setErrorSheet(null);
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Account
          </Text>

          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
              onPress={openEditProfile}
              accessibilityRole="button"
              accessibilityLabel="Open Edit Profile">
              <View style={styles.iconContainer}>
                <Ionicons
                  name="person-outline"
                  size={23}
                  color={COLORS.text}
                />
              </View>

              <View style={styles.rowDetails}>
                <Text style={styles.rowTitle}>
                  Edit Profile
                </Text>

                <Text style={styles.rowSubtitle}>
                  Update your photo, name, username, and bio
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.tertiaryText}
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
              onPress={openPrivacy}
              accessibilityRole="button"
              accessibilityLabel="Open Privacy settings">
              <View style={styles.iconContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={23}
                  color={COLORS.text}
                />
              </View>

              <View style={styles.rowDetails}>
                <Text style={styles.rowTitle}>
                  Privacy
                </Text>

                <Text style={styles.rowSubtitle}>
                  Control who can view your lists
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.tertiaryText}
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
              onPress={openBlockedUsers}
              accessibilityRole="button"
              accessibilityLabel="Open Blocked Users">
              <View style={styles.iconContainer}>
                <Ionicons
                  name="ban-outline"
                  size={23}
                  color={COLORS.text}
                />
              </View>

              <View style={styles.rowDetails}>
                <Text style={styles.rowTitle}>
                  Blocked Users
                </Text>

                <Text style={styles.rowSubtitle}>
                  Manage people you've blocked
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.tertiaryText}
              />
            </Pressable>

            {canChangePassword ? (
              <>
                <View style={styles.divider} />

                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                  ]}
                  onPress={openChangePassword}
                  accessibilityRole="button"
                  accessibilityLabel="Open Change Password">
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name="key-outline"
                      size={23}
                      color={COLORS.text}
                    />
                  </View>

                  <View style={styles.rowDetails}>
                    <Text style={styles.rowTitle}>
                      Change Password
                    </Text>

                    <Text style={styles.rowSubtitle}>
                      Update your account password
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={21}
                    color={COLORS.tertiaryText}
                  />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            App
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="notifications-outline"
                  size={23}
                  color={COLORS.text}
                />
              </View>

              <View style={styles.rowDetails}>
                <Text style={styles.rowTitle}>
                  Notifications
                </Text>

                <Text style={styles.rowSubtitle}>
                  Likes, comments, and new followers
                </Text>
              </View>

              <View style={styles.notificationControl}>
                {isPushUpdating ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.accent}
                  />
                ) : (
                  <Switch
                    value={isPushEnabled}
                    onValueChange={(enabled) => {
                      void handlePushToggle(
                        enabled
                      );
                    }}
                    trackColor={{
                      false: '#E5E5EA',
                      true: COLORS.accent,
                    }}
                    ios_backgroundColor="#E5E5EA"
                    accessibilityLabel="Push notifications"
                    accessibilityHint="Turns Top 3 push notifications on or off"
                  />
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
              onPress={openAbout}
              accessibilityRole="button"
              accessibilityLabel="Open About Top 3">
              <View style={styles.iconContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={23}
                  color={COLORS.text}
                />
              </View>

              <View style={styles.rowDetails}>
                <Text style={styles.rowTitle}>
                  About
                </Text>

                <Text style={styles.rowSubtitle}>
                  Version, build, and app information
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.tertiaryText}
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
              onPress={openSupport}
              accessibilityRole="button"
              accessibilityLabel="Open Support">
              <View style={styles.iconContainer}>
                <Ionicons
                  name="help-circle-outline"
                  size={23}
                  color={COLORS.text}
                />
              </View>

              <View style={styles.rowDetails}>
                <Text style={styles.rowTitle}>
                  Support
                </Text>

                <Text style={styles.rowSubtitle}>
                  Get help or contact Top 3 support
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.tertiaryText}
              />
            </Pressable>

            {profile.isAdmin ? (
              <>
                <View style={styles.divider} />

                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                  ]}
                  onPress={openModeration}
                  accessibilityRole="button"
                  accessibilityLabel="Open Moderation">
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name="shield-outline"
                      size={23}
                      color={COLORS.text}
                    />
                  </View>

                  <View style={styles.rowDetails}>
                    <Text style={styles.rowTitle}>
                      Moderation
                    </Text>

                    <Text style={styles.rowSubtitle}>
                      Review pending reports
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={21}
                    color={COLORS.tertiaryText}
                  />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Legal
          </Text>

          <View style={styles.card}>
            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
              onPress={openPrivacyPolicy}
              accessibilityRole="button"
              accessibilityLabel="Open Privacy Policy">
              <View style={styles.iconContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={23}
                  color={COLORS.text}
                />
              </View>

              <View style={styles.rowDetails}>
                <Text style={styles.rowTitle}>
                  Privacy Policy
                </Text>

                <Text style={styles.rowSubtitle}>
                  Learn how Top 3 handles your information
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.tertiaryText}
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
              onPress={openTermsOfUse}
              accessibilityRole="button"
              accessibilityLabel="Open Terms of Use">
              <View style={styles.iconContainer}>
                <Ionicons
                  name="reader-outline"
                  size={23}
                  color={COLORS.text}
                />
              </View>

              <View style={styles.rowDetails}>
                <Text style={styles.rowTitle}>
                  Terms of Use
                </Text>

                <Text style={styles.rowSubtitle}>
                  Review the terms for using Top 3
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.tertiaryText}
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
              onPress={openCommunityStandards}
              accessibilityRole="button"
              accessibilityLabel="Open Community Standards">
              <View style={styles.iconContainer}>
                <Ionicons
                  name="people-outline"
                  size={23}
                  color={COLORS.text}
                />
              </View>

              <View style={styles.rowDetails}>
                <Text style={styles.rowTitle}>
                  Community Standards
                </Text>

                <Text style={styles.rowSubtitle}>
                  See the rules for content and behaviour
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.tertiaryText}
              />
            </Pressable>

          </View>
        </View>

        <View style={styles.signOutSection}>
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed &&
                !isSigningOut &&
                !isDeletingAccount &&
                styles.pressed,
              (isSigningOut ||
                isDeletingAccount) &&
                styles.disabled,
            ]}
            onPress={confirmSignOut}
            disabled={
              isSigningOut ||
              isDeletingAccount
            }
            accessibilityRole="button"
            accessibilityLabel="Sign out of Top 3"
            accessibilityState={{
              disabled:
                isSigningOut ||
                isDeletingAccount,
            }}>
            {isSigningOut ? (
              <ActivityIndicator
                size="small"
                color={COLORS.text}
              />
            ) : null}

            <Text style={styles.signOutButtonText}>
              {isSigningOut
                ? 'Signing Out…'
                : 'Sign Out'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.deleteAccountButton,
              pressed &&
                !isDeletingAccount &&
                !isSigningOut &&
                styles.pressed,
              (isDeletingAccount ||
                isSigningOut) &&
                styles.disabled,
            ]}
            onPress={confirmDeleteAccount}
            disabled={
              isDeletingAccount ||
              isSigningOut
            }
            accessibilityRole="button"
            accessibilityLabel="Delete Top 3 account"
            accessibilityState={{
              disabled:
                isDeletingAccount ||
                isSigningOut,
            }}>
            {isDeletingAccount ? (
              <ActivityIndicator
                size="small"
                color="#FF3B30"
              />
            ) : null}

            <Text
              style={
                styles.deleteAccountButtonText
              }>
              {isDeletingAccount
                ? 'Deleting Account…'
                : 'Delete Account'}
            </Text>
          </Pressable>
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

  scrollView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
  },

  section: {
    marginTop: SPACING.sm,
  },

  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: SPACING.md,
  },

  signOutSection: {
    marginTop: SPACING.xl,
    paddingTop: 8,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },

  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: SPACING.lg,
    backgroundColor: COLORS.border,
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  rowDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: SPACING.md,
    marginRight: SPACING.sm,
  },

  notificationControl: {
    alignSelf: 'center',
    justifyContent: 'center',
  },

  rowTitle: {
    ...TYPOGRAPHY.headline,
    color: COLORS.text,
  },

  rowSubtitle: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
  },

  signOutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  signOutButtonText: {
    ...TYPOGRAPHY.headline,
    color: COLORS.text,
    textAlign: 'center',
  },

  deleteAccountButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: COLORS.surface,
  },

  deleteAccountButtonText: {
    ...TYPOGRAPHY.headline,
    color: '#FF3B30',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.68,
  },

  disabled: {
    opacity: 0.55,
  },
});