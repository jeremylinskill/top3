import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { useBlock } from '@/context/block-context';
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
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlockedUsersScreen() {
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
    unblockingUserId,
    setUnblockingUserId,
  ] = useState<string | null>(null);

  const loadBlockedProfiles =
    useCallback(async () => {
      if (blockedUserIds.length === 0) {
        setBlockedProfiles([]);
        setIsLoadingProfiles(false);
        return;
      }

      try {
        setIsLoadingProfiles(true);

        const profiles =
          await getProfilesByIds(
            blockedUserIds
          );

        setBlockedProfiles(profiles);
      } catch (error) {
        console.error(
          'Failed to load blocked user profiles:',
          error
        );

        setBlockedProfiles([]);
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

    Alert.alert(
      `Unblock ${profile.displayName}?`,
      'They may appear in your Feed, Discover, search, and recommendations again.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unblock',
          onPress: () => {
            void handleUnblock(profile);
          },
        },
      ]
    );
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

      Alert.alert(
        'Unable to Unblock User',
        'Something went wrong while unblocking this user. Please try again.'
      );
    } finally {
      setUnblockingUserId(null);
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
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
              color={COLORS.tertiaryText}
            />

            <Text style={styles.loadingText}>
              Loading blocked users…
            </Text>
          </View>
        ) : visibleProfiles.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="ban-outline"
                size={28}
                color={COLORS.tertiaryText}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No blocked users
            </Text>

            <Text style={styles.emptyText}>
              People you block will appear here so
              you can manage them later.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
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
                        style={styles.divider}
                      />
                    ) : null}

                    <View style={styles.row}>
                      <View
                        style={
                          styles.avatarContainer
                        }>
                        {blockedProfile.avatarUrl ? (
                          <Image
                            source={{
                              uri:
                                blockedProfile.avatarUrl,
                            }}
                            style={styles.avatar}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text
                            style={
                              styles.avatarText
                            }>
                            {blockedProfile.displayName
                              .charAt(0)
                              .toUpperCase()}
                          </Text>
                        )}
                      </View>

                      <View
                        style={
                          styles.profileDetails
                        }>
                        <Text
                          style={styles.name}
                          numberOfLines={1}>
                          {
                            blockedProfile.displayName
                          }
                        </Text>

                        <Text
                          style={styles.username}
                          numberOfLines={1}>
                          @{blockedProfile.username}
                        </Text>
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          styles.unblockButton,
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
                            color={COLORS.text}
                          />
                        ) : (
                          <Text
                            style={
                              styles.unblockButtonText
                            }>
                            Unblock
                          </Text>
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

  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },

  loadingText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
  },

  emptyState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyTitle: {
    ...TYPOGRAPHY.headline,
    marginTop: SPACING.md,
    color: COLORS.text,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  card: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.border,
  },

  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },

  avatar: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  profileDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: SPACING.md,
    marginRight: SPACING.md,
  },

  name: {
    ...TYPOGRAPHY.headline,
    color: COLORS.text,
  },

  username: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
  },

  unblockButton: {
    minWidth: 86,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  pressed: {
    opacity: 0.68,
  },

  disabled: {
    opacity: 0.55,
  },
});