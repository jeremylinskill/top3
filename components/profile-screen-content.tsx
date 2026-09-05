import FollowButton from '@/components/follow-button';
import PrimaryButton from '@/components/primary-button';
import TasteMatchBadge from '@/components/taste-match-badge';
import Top3Card from '@/components/top3-card';
import UserAvatar from '@/components/user-avatar';
import { AVATAR } from '@/constants/avatar';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import {
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

  canViewPosts?: boolean;

  isFollowing?: boolean;
  isFollowRequested?: boolean;
  isLoadingFollowState?: boolean;

  onToggleFollow?: () => void;
  onCreateTop3?: () => void;
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

  canViewPosts = true,

  isFollowing = false,
  isFollowRequested = false,
  isLoadingFollowState = false,

  onToggleFollow,
  onCreateTop3,
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
            {canViewPosts ? publishedPosts.length : 0}
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
            <Text style={styles.loadingText}>
              Loading Top 3s…
            </Text>
          </View>
        ) : !canViewPosts ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              This account is private
            </Text>

            <Text style={styles.emptyStateText}>
              This person's lists are only visible to approved followers.
            </Text>
          </View>
        ) : publishedPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              {isCurrentUser
                ? 'Nothing published'
                : 'Nothing published yet'}
            </Text>

            <Text style={styles.emptyStateText}>
              {isCurrentUser
                ? 'Publish a Top 3 to see it here.'
                : 'This person has not published any Top 3s yet.'}
            </Text>

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

  displayName: {
    ...TYPOGRAPHY.pageTitle,
  },

  username: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 2,
    color: COLORS.tertiaryText,
  },

  bio: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    color: COLORS.secondaryText,
  },

  emptyBio: {
    ...TYPOGRAPHY.label,
    marginTop: SPACING.sm,
    fontWeight: '400',
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
    ...TYPOGRAPHY.metadata,
    marginTop: 3,
  },

  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: COLORS.border,
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

  loadingText: {
    ...TYPOGRAPHY.bodyLarge,
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
  },

  emptyStateText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  emptyStateAction: {
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },
});