import FollowButton from '@/components/follow-button';
import PrimaryButton from '@/components/primary-button';
import TasteMatchBadge from '@/components/taste-match-badge';
import Top3Card from '@/components/top3-card';
import { AVATAR } from '@/constants/avatar';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type ProfileScreenContentProps = {
  user: UserProfile;
  publishedPosts: Post[];
  isCurrentUser: boolean;

  followerCount?: number;
  followingCount?: number;

  tasteMatchScore?: number;
  tasteMatchSharedPickCount?: number;
  tasteMatchItemTitlesByPostId?: Record<
    string,
    string[]
  >;

  isLoadingPosts?: boolean;

  isFollowing?: boolean;
  isLoadingFollowState?: boolean;

  onEditProfile?: () => void;
  onSignOut?: () => void;
  onToggleFollow?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onTasteMatchPress?: () => void;

  onTitlePress: (post: Post) => void;
  onPostPress: (post: Post) => void;
  onCommentsPress: (post: Post) => void;
  onEditPost?: (post: Post) => void;
};

export default function ProfileScreenContent({
  user,
  publishedPosts,
  isCurrentUser,

  followerCount = 0,
  followingCount = 0,

  tasteMatchScore,
  tasteMatchSharedPickCount = 0,
  tasteMatchItemTitlesByPostId = {},

  isLoadingPosts = false,

  onEditProfile,
  onSignOut,
  onFollowersPress,
  onFollowingPress,
  onTasteMatchPress,

  onTitlePress,
  onPostPress,
  onCommentsPress,
  onEditPost,
}: ProfileScreenContentProps) {
  const shouldShowTasteMatch =
    !isCurrentUser &&
    typeof tasteMatchScore === 'number';

  return (
    <>
      <View style={styles.identitySection}>
        <View style={styles.avatar}>
          {user.avatarUrl ? (
            <Image
              source={{
                uri: user.avatarUrl,
              }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarText}>
              {user.displayName
                .charAt(0)
                .toUpperCase()}
            </Text>
          )}
        </View>

        <View style={styles.identityDetails}>
          <Text style={styles.displayName}>
            {user.displayName}
          </Text>

          <Text style={styles.username}>
            @{user.username}
          </Text>

          {shouldShowTasteMatch ? (
            <TasteMatchBadge
              score={tasteMatchScore}
              sharedPickCount={
                tasteMatchSharedPickCount
              }
              onPress={onTasteMatchPress}
            />
          ) : null}

          {user.bio ? (
            <Text
              style={styles.bio}
              numberOfLines={3}>
              {user.bio}
            </Text>
          ) : isCurrentUser ? (
            <Text
              style={styles.emptyBio}
              numberOfLines={2}>
              Add a bio to tell people about your
              taste.
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {publishedPosts.length}
          </Text>

          <Text style={styles.statLabel}>
            Top 3s
          </Text>
        </View>

        <View style={styles.statDivider} />

        <Pressable
          style={({ pressed }) => [
            styles.stat,
            pressed &&
              onFollowersPress &&
              styles.statPressed,
          ]}
          onPress={onFollowersPress}
          disabled={!onFollowersPress}
          accessibilityRole={
            onFollowersPress
              ? 'button'
              : undefined
          }
          accessibilityLabel={
            onFollowersPress
              ? `View ${user.displayName}'s followers`
              : undefined
          }>
          <Text style={styles.statValue}>
            {followerCount}
          </Text>

          <Text style={styles.statLabel}>
            Followers
          </Text>
        </Pressable>

        <View style={styles.statDivider} />

        <Pressable
          style={({ pressed }) => [
            styles.stat,
            pressed &&
              onFollowingPress &&
              styles.statPressed,
          ]}
          onPress={onFollowingPress}
          disabled={!onFollowingPress}
          accessibilityRole={
            onFollowingPress
              ? 'button'
              : undefined
          }
          accessibilityLabel={
            onFollowingPress
              ? `View ${user.displayName}'s following`
              : undefined
          }>
          <Text style={styles.statValue}>
            {followingCount}
          </Text>

          <Text style={styles.statLabel}>
            Following
          </Text>
        </Pressable>
      </View>

      {isCurrentUser ? (
        <View style={styles.profileActions}>
          {onEditProfile ? (
            <PrimaryButton
              title="Edit Profile"
              onPress={onEditProfile}
            />
          ) : null}

          {onSignOut ? (
            <Pressable
              style={({ pressed }) => [
                styles.signOutButton,
                pressed &&
                  styles.signOutButtonPressed,
              ]}
              onPress={onSignOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out">
              <Text style={styles.signOutButtonText}>
                Sign Out
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.profileActions}>
          <FollowButton
            userId={user.id}
            size="large"
          />
        </View>
      )}

      <View style={styles.section}>
        {isLoadingPosts ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>
              Loading Top 3s…
            </Text>
          </View>
        ) : publishedPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              Nothing published yet
            </Text>

            <Text style={styles.emptyStateText}>
              {isCurrentUser
                ? 'Complete and publish a Top 3 to show it on your profile.'
                : 'This person has not published any Top 3s yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.postList}>
            {publishedPosts.map((post) => (
              <Top3Card
                key={post.id}
                post={post}
                author={user}
                showAuthor={false}
                tasteMatchItemTitles={
                  !isCurrentUser
                    ? tasteMatchItemTitlesByPostId[
                        post.id
                      ] ?? []
                    : []
                }
                onTitlePress={() =>
                  onTitlePress(post)
                }
                onPress={() =>
                  onPostPress(post)
                }
                onEditPress={
                  isCurrentUser && onEditPost
                    ? () => onEditPost(post)
                    : undefined
                }
                onCommentsPress={() =>
                  onCommentsPress(post)
                }
              />
            ))}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  identitySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: AVATAR.xl,
    height: AVATAR.xl,
    borderRadius: AVATAR.xl / 2,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: '700',
  },

  identityDetails: {
    flex: 1,
    marginLeft: SPACING.lg,
  },

  displayName: {
    ...TYPOGRAPHY.pageTitle,
  },

  username: {
    marginTop: 2,
    fontSize: 16,
    color: COLORS.tertiaryText,
  },

  bio: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    color: COLORS.secondaryText,
  },

  emptyBio: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
  },

  statsRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    overflow: 'hidden',
  },

  stat: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statPressed: {
    opacity: 0.55,
  },

  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },

  statLabel: {
    marginTop: 3,
    fontSize: 13,
    color: COLORS.tertiaryText,
  },

  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: COLORS.border,
  },

  profileActions: {
    marginTop: 14,
    gap: SPACING.sm,
  },

  signOutButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
  },

  signOutButtonPressed: {
    opacity: 0.55,
  },

  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  section: {
    marginTop: SPACING.lg,
  },

  postList: {
    gap: SPACING.lg,
  },

  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    fontSize: 16,
    color: COLORS.tertiaryText,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: SPACING.xxl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyStateTitle: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: 19,
  },

  emptyStateText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },
});