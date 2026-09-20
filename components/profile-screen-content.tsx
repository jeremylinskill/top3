import AppText from '@/components/app-text';
import FollowButton from '@/components/follow-button';
import PrimaryButton from '@/components/primary-button';
import TasteMatchBadge from '@/components/taste-match-badge';
import Top3Card from '@/components/top3-card';
import UserAvatar from '@/components/user-avatar';
import { AVATAR } from '@/constants/avatar';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
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
  hasPostsLoadError?: boolean;

  canViewPosts?: boolean;

  isFollowing?: boolean;
  isFollowRequested?: boolean;
  isLoadingFollowState?: boolean;

  onToggleFollow?: () => void;
  onCreateTop3?: () => void;
  onRetryPosts?: () => void;
  onSavedPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onTasteMatchPress?: () => void;

  onTitlePress: (post: Post) => void;
  onPostPress: (post: Post) => void;
  onCommentsPress: (post: Post) => void;
  onSharePost?: (post: Post) => void;
  onEditPost?: (post: Post) => void;
  onMorePostPress?: (post: Post) => void;
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
  hasPostsLoadError = false,

  canViewPosts = true,

  isFollowing = false,
  isFollowRequested = false,
  isLoadingFollowState = false,

  onToggleFollow,
  onCreateTop3,
  onRetryPosts,
  onSavedPress,
  onFollowersPress,
  onFollowingPress,
  onTasteMatchPress,

  onTitlePress,
  onPostPress,
  onCommentsPress,
  onSharePost,
  onEditPost,
  onMorePostPress,
}: ProfileScreenContentProps) {
  const colors = useAppColors();

  const shouldShowTasteMatch =
    !isCurrentUser &&
    typeof tasteMatchScore === 'number';

  return (
    <>
      <View style={styles.identitySection}>
        <UserAvatar
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          size={AVATAR.xl}
          fontSize={30}
        />

        <View style={styles.identityDetails}>
          <AppText variant="pageTitle">
            {user.displayName}
          </AppText>

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.username}>
            @{user.username}
          </AppText>

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
            <AppText
              variant="body"
              style={styles.bio}
              numberOfLines={3}>
              {user.bio}
            </AppText>
          ) : isCurrentUser ? (
            <AppText
              variant="label"
              tone="tertiary"
              emphasis="regular"
              style={styles.emptyBio}
              numberOfLines={2}>
              Add a bio to tell people about your
              taste.
            </AppText>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.statsRow,
          {
            backgroundColor: colors.surface,
          },
        ]}>
        <View style={styles.stat}>
          <AppText variant="statValue">
            {!canViewPosts
              ? 0
              : isLoadingPosts ||
                  hasPostsLoadError
                ? '—'
                : publishedPosts.length}
          </AppText>

          <AppText
            variant="metadata"
            style={styles.statLabel}>
            Top 3s
          </AppText>
        </View>

        <View
          style={[
            styles.statDivider,
            { backgroundColor: colors.border },
          ]}
        />

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
          <AppText variant="statValue">
            {followerCount}
          </AppText>

          <AppText
            variant="metadata"
            style={styles.statLabel}>
            Followers
          </AppText>
        </Pressable>

        <View
          style={[
            styles.statDivider,
            { backgroundColor: colors.border },
          ]}
        />

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
          <AppText variant="statValue">
            {followingCount}
          </AppText>

          <AppText
            variant="metadata"
            style={styles.statLabel}>
            Following
          </AppText>
        </Pressable>
      </View>

      {isCurrentUser && onSavedPress ? (
        <Pressable
          style={({ pressed }) => [
            styles.savedRow,
            {
              backgroundColor: colors.surface,
            },
            pressed && styles.savedRowPressed,
          ]}
          onPress={onSavedPress}
          accessibilityRole="button"
          accessibilityLabel="Open Saved">
          <View
            style={[
              styles.savedIconContainer,
              {
                backgroundColor:
                  colors.background,
              },
            ]}>
            <Ionicons
              name="bookmark-outline"
              size={22}
              color={colors.text}
            />
          </View>

          <View style={styles.savedDetails}>
            <AppText variant="headline">
              Saved
            </AppText>

            <AppText
              variant="label"
              tone="tertiary"
              emphasis="regular"
              style={styles.savedSubtitle}
              numberOfLines={1}>
              Movies, books, music and more
            </AppText>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color={colors.tertiaryText}
          />
        </Pressable>
      ) : null}

      {!isCurrentUser ? (
        <View style={styles.profileActions}>
          <FollowButton
            userId={user.id}
            size="large"
            isFollowing={isFollowing}
            isRequested={isFollowRequested}
            isPrivate={user.visibility === 'private'}
            isLoading={isLoadingFollowState}
            onPress={onToggleFollow}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        {isLoadingPosts ? (
          <View style={styles.loadingState}>
            <AppText
              variant="bodyLarge"
              tone="tertiary">
              Loading Top 3s…
            </AppText>
          </View>
        ) : !canViewPosts ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <AppText variant="sectionTitle">
              This account is private
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyStateText}>
              This person's lists are only visible to approved followers.
            </AppText>
          </View>
        ) : hasPostsLoadError ? (
          <View style={styles.emptyState}>
            <AppText variant="sectionTitle">
              {isCurrentUser
                ? 'Couldn’t load your Top 3s'
                : 'Couldn’t load Top 3s'}
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyStateText}>
              Check your connection and try again.
            </AppText>

            {onRetryPosts ? (
              <PrimaryButton
                title="Try Again"
                onPress={onRetryPosts}
                style={styles.emptyStateAction}
              />
            ) : null}
          </View>
        ) : publishedPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText variant="sectionTitle">
              {isCurrentUser
                ? 'Nothing published'
                : 'Nothing published yet'}
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyStateText}>
              {isCurrentUser
                ? 'Publish a Top 3 to see it here.'
                : 'This person has not published any Top 3s yet.'}
            </AppText>

            {isCurrentUser && onCreateTop3 ? (
              <PrimaryButton
                title="Create a Top 3"
                onPress={onCreateTop3}
                style={styles.emptyStateAction}
              />
            ) : null}
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
                onMorePress={
                  !isCurrentUser && onMorePostPress
                    ? () => onMorePostPress(post)
                    : undefined
                }
                onCommentsPress={() =>
                  onCommentsPress(post)
                }
                onSharePress={
                  onSharePost
                    ? () => onSharePost(post)
                    : undefined
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

  identityDetails: {
    flex: 1,
    marginLeft: SPACING.lg,
  },

  username: {
    marginTop: 2,
  },

  bio: {
    marginTop: SPACING.sm,
  },

  emptyBio: {
    marginTop: SPACING.sm,
  },

  statsRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
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

  statLabel: {
    marginTop: 3,
  },

  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
  },

  savedRow: {
    marginTop: SPACING.sm,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },

  savedRowPressed: {
    opacity: 0.65,
  },

  savedIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  savedDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: SPACING.md,
  },

  savedSubtitle: {
    marginTop: 2,
  },

  profileActions: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
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

  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.xl,
  },

  emptyStateText: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  emptyStateAction: {
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },
});