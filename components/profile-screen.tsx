import ActionSheet, {
  ActionSheetAction,
} from '@/components/action-sheet';
import CommentsSheet from '@/components/comments-sheet';
import ProfileScreenContent from '@/components/profile-screen-content';
import ScreenHeader from '@/components/screen-header';
import { useBlock } from '@/context/block-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useAuth } from '@/hooks/use-auth';
import type { FollowCounts } from '@/lib/supabase/follows';
import { getFollowCounts } from '@/lib/supabase/follows';
import { getProfileById } from '@/lib/supabase/profiles';
import {
  createPostReport,
  createUserReport,
  ReportReason,
} from '@/lib/supabase/reports';
import { getPublishedPostsByUser } from '@/services/post-service';
import { getTasteRecommendationForUser } from '@/services/taste-recommendation-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileScreenProps = {
  userId?: string;
  showBackButton?: boolean;
};

type ModerationSheet =
  | { type: 'profile-actions' }
  | { type: 'report-reasons' }
  | { type: 'confirm-block' }
  | { type: 'confirm-unblock' }
  | {
      type: 'confirm-report';
      reason: ReportReason;
      reasonLabel: string;
    }
  | {
      type: 'list-actions';
      post: Post;
    }
  | {
      type: 'list-report-reasons';
      post: Post;
    }
  | {
      type: 'confirm-list-report';
      post: Post;
      reason: ReportReason;
      reasonLabel: string;
    }
  | null;

function normalizeTopic(topic?: string) {
  return topic?.trim().toLowerCase() || 'general';
}

function normalizeItemTitle(title?: string) {
  return title?.trim().toLowerCase() ?? '';
}

function sortPostsByPublishedDate(
  posts: Post[]
): Post[] {
  return [...posts].sort(
    (first, second) =>
      new Date(second.publishedAt).getTime() -
      new Date(first.publishedAt).getTime()
  );
}

function mergePosts(
  firstPosts: Post[],
  secondPosts: Post[]
): Post[] {
  const postsById = new Map<string, Post>();

  firstPosts.forEach((post) => {
    postsById.set(post.id, post);
  });

  secondPosts.forEach((post) => {
    postsById.set(post.id, post);
  });

  return sortPostsByPublishedDate(
    Array.from(postsById.values())
  );
}

export default function ProfileScreen({
  userId,
  showBackButton = false,
}: ProfileScreenProps) {
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();

  const {
    isBlocked,
    blockUser,
    unblockUser,
  } = useBlock();

  const {
    isFollowing,
    isFollowRequested,
    toggleFollow,
    requestFollow,
    cancelFollowRequest,
    getFollowingCount,
    getFollowerCount,
    isLoading: isLoadingFollowState,
  } = useFollow();

  const [allPosts, setAllPosts] = useState<
    Post[]
  >([]);

  const [isLoadingPosts, setIsLoadingPosts] =
    useState(true);

  const [
    viewedUserFollowCounts,
    setViewedUserFollowCounts,
  ] = useState<FollowCounts>({
    followingCount: 0,
    followerCount: 0,
  });

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  const [
    moderationSheet,
    setModerationSheet,
  ] = useState<ModerationSheet>(null);

  const [viewedUser, setViewedUser] = useState<
    UserProfile | null
  >(() =>
    !userId || userId === profile.id
      ? profile
      : null
  );

  const [isLoadingProfile, setIsLoadingProfile] =
    useState(
      Boolean(userId && userId !== profile.id)
    );

  useEffect(() => {
    let isMounted = true;

    async function loadViewedUser() {
      if (!userId || userId === profile.id) {
        setViewedUser(profile);
        setIsLoadingProfile(false);
        return;
      }

      setViewedUser(null);
      setIsLoadingProfile(true);

      try {
        const requestedProfile =
          await getProfileById(userId);

        if (isMounted) {
          setViewedUser(requestedProfile);
        }
      } catch (error) {
        console.error(
          'Failed to load profile:',
          error
        );

        if (isMounted) {
          setViewedUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadViewedUser();

    return () => {
      isMounted = false;
    };
  }, [profile, userId]);

  const isCurrentUser =
    viewedUser?.id === profile.id;

  const viewedUserId = viewedUser?.id;

  const userIsFollowed =
    viewedUserId && !isCurrentUser
      ? isFollowing(viewedUserId)
      : false;

  const userHasRequested =
    viewedUserId && !isCurrentUser
      ? isFollowRequested(viewedUserId)
      : false;

  const canViewPosts =
    viewedUser?.visibility === 'public' ||
    isCurrentUser ||
    userIsFollowed;

  const currentUserFollowingCount =
    getFollowingCount();

  const currentUserFollowerCount =
    getFollowerCount();

  useEffect(() => {
    let isMounted = true;

    async function loadViewedUserFollowCounts() {
      if (!viewedUserId || isCurrentUser) {
        if (isMounted) {
          setViewedUserFollowCounts({
            followingCount: 0,
            followerCount: 0,
          });
        }

        return;
      }

      try {
        const followCounts =
          await getFollowCounts(viewedUserId);

        if (isMounted) {
          setViewedUserFollowCounts(
            followCounts
          );
        }
      } catch (error) {
        console.error(
          'Failed to load profile follow counts:',
          error
        );

        if (isMounted) {
          setViewedUserFollowCounts({
            followingCount: 0,
            followerCount: 0,
          });
        }
      }
    }

    void loadViewedUserFollowCounts();

    return () => {
      isMounted = false;
    };
  }, [isCurrentUser, viewedUserId]);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      if (
        !isAuthenticated ||
        !profile.id ||
        !viewedUserId
      ) {
        if (isMounted) {
          setAllPosts([]);
          setIsLoadingPosts(false);
        }

        return;
      }

      setIsLoadingPosts(true);

      try {
        const currentUserPosts =
          await getPublishedPostsByUser(
            profile.id
          );

        if (viewedUserId === profile.id) {
          if (isMounted) {
            setAllPosts(currentUserPosts);
          }

          return;
        }

        if (!canViewPosts) {
          if (isMounted) {
            setAllPosts(currentUserPosts);
          }

          return;
        }

        const viewedUserPosts =
          await getPublishedPostsByUser(
            viewedUserId
          );

        if (isMounted) {
          setAllPosts(
            mergePosts(
              currentUserPosts,
              viewedUserPosts
            )
          );
        }
      } catch (error) {
        console.error(
          'Failed to load profile posts:',
          error
        );

        if (isMounted) {
          setAllPosts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPosts(false);
        }
      }
    }

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, [
    canViewPosts,
    isAuthenticated,
    profile.id,
    viewedUserId,
  ]);

  const publishedPosts = useMemo(() => {
    if (!viewedUserId) {
      return [];
    }

    return allPosts
      .filter(
        (post) =>
          post.authorId === viewedUserId
      )
      .sort(
        (first, second) =>
          new Date(
            second.publishedAt
          ).getTime() -
          new Date(
            first.publishedAt
          ).getTime()
      );
  }, [allPosts, viewedUserId]);

  const tasteMatch = useMemo(() => {
    if (
      !viewedUserId ||
      isCurrentUser ||
      !canViewPosts ||
      isLoadingPosts
    ) {
      return null;
    }

    return getTasteRecommendationForUser({
      posts: allPosts,
      profilesByUserId: {
        [viewedUser.id]: viewedUser,
      },
      currentUserId: profile.id,
      otherUserId: viewedUserId,
    });
  }, [
    allPosts,
    canViewPosts,
    isCurrentUser,
    isLoadingPosts,
    profile.id,
    viewedUser,
    viewedUserId,
  ]);

  const tasteMatchItemTitlesByPostId =
    useMemo<Record<string, string[]>>(() => {
      if (
        isCurrentUser ||
        !tasteMatch
      ) {
        return {};
      }

      const normalizedSharedItems = new Set(
        tasteMatch.sharedItems
          .map(normalizeItemTitle)
          .filter(Boolean)
      );

      return publishedPosts.reduce<
        Record<string, string[]>
      >((matchesByPostId, post) => {
        const matchingTitles =
          post.collection.items
            .filter(
              (
                item
              ): item is NonNullable<
                typeof item
              > => item !== null
            )
            .map((item) => item.title.trim())
            .filter(Boolean)
            .filter((title) =>
              normalizedSharedItems.has(
                normalizeItemTitle(title)
              )
            );

        if (matchingTitles.length > 0) {
          matchesByPostId[post.id] =
            matchingTitles;
        }

        return matchesByPostId;
      }, {});
    }, [
      isCurrentUser,
      publishedPosts,
      tasteMatch,
    ]);

  function openPublishedPost(post: Post) {
    router.push({
      pathname: '/published-top3',
      params: {
        postId: post.id,
      },
    });
  }

  function openCollectionFeed(post: Post) {
    router.push({
      pathname: '/category-feed',
      params: {
        category: post.collection.category,
        topic: normalizeTopic(
          post.collection.topic
        ),
      },
    });
  }

  function editCollection(post: Post) {
    if (!isCurrentUser) {
      return;
    }

    router.push({
      pathname: '/collection',
      params: {
        listId: post.collection.id,
      },
    });
  }

  function openSettings() {
    if (!isCurrentUser) {
      return;
    }

    router.push('/settings');
  }

  async function handleBlockUser() {
    if (
      !viewedUserId ||
      isCurrentUser
    ) {
      return;
    }

    try {
      await blockUser(viewedUserId);

      Alert.alert(
        'User blocked',
        `${viewedUser.displayName} has been blocked.`
      );
    } catch (error) {
      console.error(
        'Failed to block user:',
        error
      );

      Alert.alert(
        'Unable to block user',
        'Please try again.'
      );
    }
  }

  async function handleUnblockUser() {
    if (
      !viewedUserId ||
      isCurrentUser
    ) {
      return;
    }

    try {
      await unblockUser(viewedUserId);

      Alert.alert(
        'User unblocked',
        `${viewedUser.displayName} has been unblocked.`
      );
    } catch (error) {
      console.error(
        'Failed to unblock user:',
        error
      );

      Alert.alert(
        'Unable to unblock user',
        'Please try again.'
      );
    }
  }

  function closeModerationSheet() {
    setModerationSheet(null);
  }

  function confirmBlockUser() {
    if (
      !viewedUserId ||
      isCurrentUser
    ) {
      return;
    }

    setModerationSheet({
      type: 'confirm-block',
    });
  }

  function confirmUnblockUser() {
    if (
      !viewedUserId ||
      isCurrentUser
    ) {
      return;
    }

    setModerationSheet({
      type: 'confirm-unblock',
    });
  }

  async function handleReportUser(
    reason: ReportReason
  ) {
    if (
      !viewedUserId ||
      isCurrentUser
    ) {
      return;
    }

    try {
      await createUserReport({
        reporterId: profile.id,
        reportedUserId: viewedUserId,
        reason,
      });

      Alert.alert(
        'Report submitted',
        'Thanks for letting us know. Your report has been submitted for review.'
      );
    } catch (error) {
      console.error(
        'Failed to report user:',
        error
      );

      Alert.alert(
        'Unable to submit report',
        'Please try again.'
      );
    }
  }

  function confirmReportUser(
    reason: ReportReason,
    reasonLabel: string
  ) {
    if (
      !viewedUserId ||
      isCurrentUser
    ) {
      return;
    }

    setModerationSheet({
      type: 'confirm-report',
      reason,
      reasonLabel,
    });
  }

  function openReportMenu() {
    if (
      !viewedUserId ||
      isCurrentUser
    ) {
      return;
    }

    setModerationSheet({
      type: 'report-reasons',
    });
  }

  function openProfileMenu() {
    if (
      !viewedUserId ||
      isCurrentUser
    ) {
      return;
    }

    setModerationSheet({
      type: 'profile-actions',
    });
  }

  function openListMenu(post: Post) {
    if (
      !viewedUserId ||
      isCurrentUser ||
      post.authorId !== viewedUserId
    ) {
      return;
    }

    setModerationSheet({
      type: 'list-actions',
      post,
    });
  }

  function openListReportReasons(post: Post) {
    if (
      !viewedUserId ||
      isCurrentUser ||
      post.authorId !== viewedUserId
    ) {
      return;
    }

    setModerationSheet({
      type: 'list-report-reasons',
      post,
    });
  }

  function confirmListReport(
    post: Post,
    reason: ReportReason,
    reasonLabel: string
  ) {
    if (
      !viewedUserId ||
      isCurrentUser ||
      post.authorId !== viewedUserId
    ) {
      return;
    }

    setModerationSheet({
      type: 'confirm-list-report',
      post,
      reason,
      reasonLabel,
    });
  }

  async function handleReportList(
    post: Post,
    reason: ReportReason
  ) {
    if (
      !viewedUserId ||
      isCurrentUser ||
      post.authorId !== viewedUserId
    ) {
      return;
    }

    try {
      await createPostReport({
        reporterId: profile.id,
        reportedUserId: viewedUserId,
        reportedPostId: post.id,
        reason,
      });

      Alert.alert(
        'Report submitted',
        'Thanks for letting us know. Your report has been submitted for review.'
      );
    } catch (error) {
      console.error(
        'Failed to report list from profile:',
        error
      );

      Alert.alert(
        'Unable to submit report',
        'Please try again.'
      );
    }
  }

  function openFollowing() {
    router.push({
      pathname: '/social',
      params: {
        tab: 'following',
      },
    });
  }

  function openFollowers() {
    router.push({
      pathname: '/social',
      params: {
        tab: 'followers',
      },
    });
  }

  function openTasteMatch() {
    if (!viewedUserId || isCurrentUser) {
      return;
    }

    router.push({
      pathname: '/taste-match',
      params: {
        userId: viewedUserId,
      },
    });
  }

  function handleToggleFollow() {
    if (
      !viewedUserId ||
      isCurrentUser ||
      isLoadingFollowState
    ) {
      return;
    }

    if (userIsFollowed) {
      setViewedUserFollowCounts(
        (currentCounts) => ({
          ...currentCounts,
          followerCount: Math.max(
            0,
            currentCounts.followerCount - 1
          ),
        })
      );

      toggleFollow(viewedUserId);
      return;
    }

    if (userHasRequested) {
      cancelFollowRequest(viewedUserId);
      return;
    }

    if (viewedUser.visibility === 'private') {
      requestFollow(viewedUserId);
      return;
    }

    setViewedUserFollowCounts(
      (currentCounts) => ({
        ...currentCounts,
        followerCount:
          currentCounts.followerCount + 1,
      })
    );

    toggleFollow(viewedUserId);
  }

  function openComments(post: Post) {
    setSelectedCommentsPost(post);
  }

  function closeComments() {
    setSelectedCommentsPost(null);
  }

  let moderationSheetTitle:
    | string
    | undefined;
  let moderationSheetMessage:
    | string
    | undefined;
  let moderationSheetActions:
    ActionSheetAction[] = [];

  if (
    moderationSheet &&
    viewedUserId &&
    !isCurrentUser
  ) {
    switch (moderationSheet.type) {
      case 'profile-actions': {
        const userIsBlocked =
          isBlocked(viewedUserId);

        moderationSheetTitle =
          undefined;

        moderationSheetActions = [
          {
            label: 'Report User',
            onPress: openReportMenu,
          },
          {
            label: userIsBlocked
              ? 'Unblock User'
              : 'Block User',
            variant: userIsBlocked
              ? 'default'
              : 'destructive',
            onPress: userIsBlocked
              ? confirmUnblockUser
              : confirmBlockUser,
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;
      }

      case 'report-reasons':
        moderationSheetTitle =
          'Report User';
        moderationSheetMessage =
          'Why are you reporting this user?';

        moderationSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmReportUser(
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmReportUser(
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmReportUser(
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmReportUser(
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmReportUser(
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmReportUser(
                'other',
                'Other'
              ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'confirm-block':
        moderationSheetTitle =
          `Block ${viewedUser.displayName}?`;
        moderationSheetMessage =
          'They will no longer be connected to you through following, and you can unblock them later.';

        moderationSheetActions = [
          {
            label: 'Block',
            variant: 'destructive',
            onPress: () => {
              closeModerationSheet();
              void handleBlockUser();
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'confirm-unblock':
        moderationSheetTitle =
          `Unblock ${viewedUser.displayName}?`;
        moderationSheetMessage =
          'You can follow each other again after unblocking.';

        moderationSheetActions = [
          {
            label: 'Unblock',
            onPress: () => {
              closeModerationSheet();
              void handleUnblockUser();
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'confirm-report':
        moderationSheetTitle =
          `Report ${viewedUser.displayName}?`;
        moderationSheetMessage =
          `Reason: ${moderationSheet.reasonLabel}`;

        moderationSheetActions = [
          {
            label: 'Submit Report',
            variant: 'destructive',
            onPress: () => {
              const reason =
                moderationSheet.reason;

              closeModerationSheet();
              void handleReportUser(reason);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'list-actions':
        moderationSheetTitle =
          undefined;

        moderationSheetActions = [
          {
            label: 'Report List',
            onPress: () =>
              openListReportReasons(
                moderationSheet.post
              ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'list-report-reasons':
        moderationSheetTitle =
          'Report List';
        moderationSheetMessage =
          'Why are you reporting this list?';

        moderationSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmListReport(
                moderationSheet.post,
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmListReport(
                moderationSheet.post,
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmListReport(
                moderationSheet.post,
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmListReport(
                moderationSheet.post,
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmListReport(
                moderationSheet.post,
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmListReport(
                moderationSheet.post,
                'other',
                'Other'
              ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'confirm-list-report':
        moderationSheetTitle =
          'Report this list?';
        moderationSheetMessage =
          `Reason: ${moderationSheet.reasonLabel}`;

        moderationSheetActions = [
          {
            label: 'Submit Report',
            variant: 'destructive',
            onPress: () => {
              const {
                post,
                reason,
              } = moderationSheet;

              closeModerationSheet();
              void handleReportList(
                post,
                reason
              );
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;
    }
  }

  if (isLoadingProfile) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right']}>
        <ScreenHeader
          showBackButton={showBackButton}
        />

        <View style={styles.messageContainer}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!viewedUser) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right']}>
        <ScreenHeader
          title="Profile Not Found"
          showBackButton={showBackButton}
        />

        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>
            This profile is unavailable
          </Text>

          <Text style={styles.messageText}>
            The user may no longer exist or the
            profile could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader
        showBackButton={showBackButton}
        rightIconName={
          isCurrentUser
            ? 'settings-outline'
            : 'ellipsis-horizontal'
        }
        onRightPress={
          isCurrentUser
            ? openSettings
            : openProfileMenu
        }
        rightAccessibilityLabel={
          isCurrentUser
            ? 'Open settings'
            : 'Open profile actions'
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ProfileScreenContent
          user={viewedUser}
          publishedPosts={publishedPosts}
          isCurrentUser={isCurrentUser}
          followerCount={
            isCurrentUser
              ? currentUserFollowerCount
              : viewedUserFollowCounts.followerCount
          }
          followingCount={
            isCurrentUser
              ? currentUserFollowingCount
              : viewedUserFollowCounts.followingCount
          }
          tasteMatchScore={
            tasteMatch?.score
          }
          tasteMatchSharedPickCount={
            tasteMatch?.sharedItems.length ?? 0
          }
          tasteMatchItemTitlesByPostId={
            tasteMatchItemTitlesByPostId
          }
          onTasteMatchPress={
            tasteMatch
              ? openTasteMatch
              : undefined
          }
          onFollowersPress={
            isCurrentUser
              ? openFollowers
              : undefined
          }
          onFollowingPress={
            isCurrentUser
              ? openFollowing
              : undefined
          }
          isLoadingPosts={isLoadingPosts}
          canViewPosts={canViewPosts}
          isFollowing={userIsFollowed}
          isFollowRequested={
            userHasRequested
          }
          isLoadingFollowState={
            isLoadingFollowState
          }
          onToggleFollow={
            isCurrentUser
              ? undefined
              : handleToggleFollow
          }
          onTitlePress={openCollectionFeed}
          onPostPress={openPublishedPost}
          onEditPost={
            isCurrentUser
              ? editCollection
              : undefined
          }
          onMorePostPress={
            isCurrentUser
              ? undefined
              : openListMenu
          }
          onCommentsPress={openComments}
        />
      </ScrollView>

      <ActionSheet
        visible={moderationSheet !== null}
        title={moderationSheetTitle}
        message={moderationSheetMessage}
        actions={moderationSheetActions}
        onClose={closeModerationSheet}
      />

      <CommentsSheet
        visible={
          selectedCommentsPost !== null
        }
        post={selectedCommentsPost}
        onClose={closeComments}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  messageContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#777777',
  },

  messageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
    textAlign: 'center',
  },
});