import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import UserAvatar from '@/components/user-avatar';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useBlock } from '@/context/block-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { getProfilesByIds } from '@/lib/supabase/profiles';
import { UserProfile } from '@/types/user-profile';
import { Ionicons } from '@expo/vector-icons';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlockedUsersScreen() {
  const colors = useAppColors();
  const {
    blockedUserIds,
    isLoading: isLoadingBlocks,
    unblockUser,
  } = useBlock();

  const [blockedProfiles, setBlockedProfiles] =
    useState<UserProfile[]>([]);

  const [isLoadingProfiles, setIsLoadingProfiles] =
    useState(true);

  const [
    hasLoadError,
    setHasLoadError,
  ] = useState(false);

  const [
    unblockingUserId,
    setUnblockingUserId,
  ] = useState<string | null>(null);

  const [
    pendingUnblockProfile,
    setPendingUnblockProfile,
  ] = useState<UserProfile | null>(null);

  const [
    errorSheet,
    setErrorSheet,
  ] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const loadBlockedProfiles =
    useCallback(async () => {
      if (blockedUserIds.length === 0) {
        setBlockedProfiles([]);
        setHasLoadError(false);
        setIsLoadingProfiles(false);
        return;
      }

      try {
        setIsLoadingProfiles(true);
        setHasLoadError(false);

        const profiles =
          await getProfilesByIds(
            blockedUserIds
          );

        setBlockedProfiles(profiles);
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load blocked user profiles:',
            error
          );
        }

        setBlockedProfiles([]);
        setHasLoadError(true);
      } finally {
        setIsLoadingProfiles(false);
      }
    }, [blockedUserIds]);

  useEffect(() => {
    void loadBlockedProfiles();
  }, [loadBlockedProfiles]);

  const visibleProfiles = useMemo(
    () =>
      blockedProfiles
        .filter((profile) =>
          blockedUserIds.includes(profile.id)
        )
        .sort((first, second) =>
          first.displayName.localeCompare(
            second.displayName
          )
        ),
    [
      blockedProfiles,
      blockedUserIds,
    ]
  );

  const isLoading =
    isLoadingBlocks || isLoadingProfiles;

  function confirmUnblock(
    profile: UserProfile
  ) {
    if (unblockingUserId) {
      return;
    }

    setPendingUnblockProfile(profile);
  }

  async function handleUnblock(
    profile: UserProfile
  ) {
    if (unblockingUserId) {
      return;
    }

    setUnblockingUserId(profile.id);

    try {
      await unblockUser(profile.id);

      setBlockedProfiles(
        (currentProfiles) =>
          currentProfiles.filter(
            (candidateProfile) =>
              candidateProfile.id !==
              profile.id
          )
      );
    } catch (error) {
      console.error(
        'Failed to unblock user:',
        error
      );

      setErrorSheet({
        title: 'Unable to Unblock User',
        message:
          'Something went wrong while unblocking this user. Please try again.',
      });
    } finally {
      setUnblockingUserId(null);
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
        edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Blocked Users"
        subtitle="Manage people you've blocked."
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator
              size="small"
              color={colors.tertiaryText}
            />

            <AppText
              variant="label"
              tone="tertiary"
              emphasis="regular">
              Loading blocked users…
            </AppText>
          </View>
        ) : hasLoadError ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor:
                    colors.background,
                },
              ]}>
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={colors.tertiaryText}
              />
            </View>

            <AppText
              variant="sectionTitle"
              style={styles.emptyTitle}>
              Couldn’t load blocked users
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyText}>
              Check your connection and try again.
            </AppText>

            <PrimaryButton
              title="Try Again"
              onPress={() => {
                void loadBlockedProfiles();
              }}
              style={styles.retryButton}
            />
          </View>
        ) : visibleProfiles.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor:
                    colors.background,
                },
              ]}>
              <Ionicons
                name="ban-outline"
                size={28}
                color={colors.tertiaryText}
              />
            </View>

            <AppText
              variant="sectionTitle"
              style={styles.emptyTitle}>
              No blocked users
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyText}>
              People you block will appear here so
              you can manage them later.
            </AppText>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            {visibleProfiles.map(
              (blockedProfile, index) => {
                const isUnblocking =
                  unblockingUserId ===
                  blockedProfile.id;

                return (
                  <View
                    key={blockedProfile.id}>
                    {index > 0 ? (
                      <View
                        style={[
                          styles.divider,
                          {
                            backgroundColor:
                              colors.border,
                          },
                        ]}
                      />
                    ) : null}

                    <View style={styles.row}>
                      <UserAvatar
                        displayName={
                          blockedProfile.displayName
                        }
                        avatarUrl={
                          blockedProfile.avatarUrl
                        }
                        size={48}
                        fontSize={18}
                      />

                      <View
                        style={
                          styles.profileDetails
                        }>
                        <AppText
                          variant="headline"
                          numberOfLines={1}>
                          {
                            blockedProfile.displayName
                          }
                        </AppText>

                        <AppText
                          variant="label"
                          tone="tertiary"
                          emphasis="regular"
                          style={styles.username}
                          numberOfLines={1}>
                          @{blockedProfile.username}
                        </AppText>
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          styles.unblockButton,
                          {
                            backgroundColor:
                              colors.surface,
                            borderColor:
                              colors.border,
                          },
                          pressed &&
                            !isUnblocking &&
                            styles.pressed,
                          isUnblocking &&
                            styles.disabled,
                        ]}
                        onPress={() =>
                          confirmUnblock(
                            blockedProfile
                          )
                        }
                        disabled={
                          Boolean(
                            unblockingUserId
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Unblock ${blockedProfile.displayName}`}
                        accessibilityState={{
                          disabled:
                            Boolean(
                              unblockingUserId
                            ),
                        }}>
                        {isUnblocking ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.text}
                          />
                        ) : (
                          <AppText
                            variant="label"
                            tone="primary">
                            Unblock
                          </AppText>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              }
            )}
          </View>
        )}
        </ScrollView>
      </SafeAreaView>

      <ActionSheet
        visible={pendingUnblockProfile !== null}
        title={
          pendingUnblockProfile
            ? `Unblock ${pendingUnblockProfile.displayName}?`
            : ''
        }
        message="They may appear in your Feed, Discover, search, and recommendations again."
        actions={[
          {
            label: 'Unblock',
            onPress: () => {
              const profile = pendingUnblockProfile;

              setPendingUnblockProfile(null);

              if (profile) {
                void handleUnblock(profile);
              }
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: () => {
              setPendingUnblockProfile(null);
            },
          },
        ]}
        onClose={() => {
          setPendingUnblockProfile(null);
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
    paddingBottom: 40,
  },

  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 28,
    borderRadius: RADIUS.xl,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: SPACING.lg,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },

  card: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },

  row: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: SPACING.lg,
  },

  profileDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: SPACING.md,
    marginRight: SPACING.md,
  },

  username: {
    marginTop: 3,
  },

  unblockButton: {
    minWidth: 86,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },

  pressed: {
    opacity: 0.68,
  },

  disabled: {
    opacity: 0.55,
  },
});