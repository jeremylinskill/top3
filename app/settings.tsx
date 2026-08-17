import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { useAuth } from '@/hooks/use-auth';
import { deleteAccount } from '@/lib/supabase/account';
import { resetWelcomeStatus } from '@/services/onboarding-service';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [
    isDeletingAccount,
    setIsDeletingAccount,
  ] = useState(false);


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


  function openChangePassword() {
    router.push('/change-password');
  }

  function openAbout() {
    router.push('/about');
  }

  function confirmSignOut() {
    if (isSigningOut) {
      return;
    }

    Alert.alert(
      'Sign out?',
      'You will need to sign in again to access your Top 3 account.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            void handleSignOut();
          },
        },
      ]
    );
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

      Alert.alert(
        'Unable to Sign Out',
        'Something went wrong while signing you out. Please try again.'
      );
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

    Alert.alert(
      'Delete your account?',
      'This permanently deletes your Top 3 account, profile, lists, comments, likes, follows, and other account data. This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            void handleDeleteAccount();
          },
        },
      ]
    );
  }

  async function handleDeleteAccount() {
    if (
      isDeletingAccount ||
      isSigningOut
    ) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      await deleteAccount();

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

      Alert.alert(
        'Unable to Delete Account',
        'Something went wrong while deleting your account. Please try again.'
      );
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
    fontSize: 18,
  },

  signOutSection: {
    marginTop: 'auto',
    paddingTop: 32,
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