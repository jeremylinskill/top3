import ActionSheet, {
  ActionSheetAction,
} from '@/components/action-sheet';
import AppText from '@/components/app-text';
import CommentsSheet from '@/components/comments-sheet';
import ProfileScreenContent from '@/components/profile-screen-content';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import {
  FLOATING_TAB_BAR_BOTTOM_SPACING,
  FLOATING_TAB_BAR_HEIGHT,
} from '@/context/tab-bar-scroll-context';
import { useBlock } from '@/context/block-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import { useAuth } from '@/hooks/use-auth';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { sharePublishedCollection } from '@/lib/share';
import type { FollowCounts } from '@/lib/supabase/follows';
import { getFollowCounts } from '@/lib/supabase/follows';
import { getProfileById } from '@/lib/supabase/profiles';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import {
  createPostReport,
  createUserReport,
  ReportReason,
} from '@/lib/supabase/reports';
import { hydrateProfileArtworkProgressively } from '@/services/post-service';
import {
  getPublishedPostsByUser,
  refreshMusicianEditorialInPosts,
} from '@/services/post-service';
import { getTasteRecommendationForUser } from '@/services/taste-recommendation-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { isNetworkError } from '@/utils/is-network-error';
import { router } from 'expo-router';
import Reanimated from 'react-native-reanimated';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Six cards render initially; expand automatically as the user scrolls.
const PROFILE_CARD_BATCH_SIZE = 6;
const PROFILE_CARD_LOAD_AHEAD_PX = 500;

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
  | { type: 'block-error' }
  | { type: 'unblock-success' }
  | { type: 'unblock-error' }
  | { type: 'report-success' }
  | { type: 'report-error' }
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
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const floatingCircleVisible = useRef(false);
  // Once Profile has scrolled, retain the frosted action circle when the
  // user scrolls upward or stops. Restore the plain top-of-page style only
  // upon reaching the actual top (rather than at the old 56px threshold).
  const handleProfileScroll = useCallback((offsetY: number) => {
    const next = offsetY <= 2
      ? false
      : offsetY > 56
        ? true
        : floatingCircleVisible.current;
    if (next !== floatingCircleVisible.current) {
      floatingCircleVisible.current = next;
      setHeaderScrolled(next);
    }
  }, []);
  // Profile previously did not update bottom tabs on scroll. Leave that
  // behaviour untouched; the existing shared Reanimated hook handles motion.
  const ignoreHeaderThreshold = useCallback((_scrolled: boolean) => {}, []);
  const {
    scrollHandler: stickyScrollHandler,
    headerStyle: stickyHeaderStyle,
    scrollY: circleScrollY,
  } = useHomeStickyHeader(handleProfileScroll, ignoreHeaderThreshold);

  const bottomScrollClearance = Math.max(
    40,
    insets.bottom +
      FLOATING_TAB_BAR_BOTTOM_SPACING +
      FLOATING_TAB_BAR_HEIGHT +
      24
  );
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

  // Rendering only nearby cards avoids mounting a large profile at once.
  const [visiblePostCount, setVisiblePostCount] = useState(PROFILE_CARD_BATCH_SIZE);
  const profileScrollMetricsRef = useRef({
    offsetY: 0,
    viewportHeight: 0,
    contentHeight: 0,
  });

  const profilePostsRefreshRunRef = useRef(0);

  const [isLoadingPosts, setIsLoadingPosts] =
    useState(true);

  const [
    hasPostsLoadError,
    setHasPostsLoadError,
  ] = useState(false);

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

  const trackedProfileViewIdRef =
    useRef<string | null>(null);

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

          if (
            requestedProfile &&
            trackedProfileViewIdRef.current !==
              requestedProfile.id
          ) {
            trackedProfileViewIdRef.current =
              requestedProfile.id;

            trackAnalyticsEvent(
              'profile_viewed'
            );
          }
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

  // A different profile starts with a fresh first batch.
  useEffect(() => {
    setVisiblePostCount(PROFILE_CARD_BATCH_SIZE);
    profileScrollMetricsRef.current.offsetY = 0;
    profileScrollMetricsRef.current.contentHeight = 0;
  }, [viewedUserId]);

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

  const canViewSocialConnections =
    canViewPosts;

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

  // Prevent an earlier load/artwork lookup from overwriting a newer profile.
  const profilePostsRequestRef = useRef(0);
  const [comparisonReadyForUserId, setComparisonReadyForUserId] =
    useState<string | null>(null);

  const loadProfilePosts = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      const requestId = ++profilePostsRequestRef.current;
      const isCurrentRequest = () =>
        profilePostsRequestRef.current === requestId;
      const startedAt = Date.now();

      if (!isAuthenticated || !profile.id || !viewedUserId) {
        setAllPosts([]);
        setIsLoadingPosts(false);
        return;
      }

      // Do not fetch another person's private lists without permission.
      if (viewedUserId !== profile.id && !canViewPosts) {
        setAllPosts([]);
        setIsLoadingPosts(false);
        return;
      }

      if (showLoading) {
        setIsLoadingPosts(true);
      }

      const applyHydratedPost = (hydrated: Post) => {
        if (!isCurrentRequest()) return;
        setAllPosts((current) => current.map((post) =>
          post.id === hydrated.id
            ? {
                ...post,
                collection: {
                  ...post.collection,
                  items: hydrated.collection.items,
                },
              }
            : post
        ));
      };

      const startBackgroundArtwork = (raw: Post[]) => {
        void hydrateProfileArtworkProgressively(raw, applyHydratedPost)
          .catch((error) => {
            if (__DEV__ && isCurrentRequest()) {
              console.log('Profile artwork lookup failed:', error);
            }
          });
      };

      try {
        // The visible profile's data has priority over Taste Match and artwork.
        const viewedPosts = await getPublishedPostsByUser(
          viewedUserId,
          { hydrateMissingArtwork: false }
        );
        if (!isCurrentRequest()) return;

        setAllPosts(viewedPosts);
        setIsLoadingPosts(false);
        if (__DEV__) {
          console.log('[Profile performance] Lists ready', {
            count: viewedPosts.length,
            elapsedMs: Date.now() - startedAt,
          });
        }
        startBackgroundArtwork(viewedPosts);

        // Taste Match also needs the signed-in user's posts, but cards do not.
        // Fetch those only after displaying the viewed person's lists.
        if (viewedUserId !== profile.id) {
          try {
            const ownPosts = await getPublishedPostsByUser(
              profile.id,
              { hydrateMissingArtwork: false }
            );
            if (!isCurrentRequest()) return;
            setAllPosts((current) => mergePosts(ownPosts, current));
            setComparisonReadyForUserId(viewedUserId);
            startBackgroundArtwork(ownPosts);
          } catch (error) {
            if (__DEV__ && isCurrentRequest()) {
              console.log('Profile Taste Match data unavailable:', error);
            }
          }
        }
      } catch (error) {
        if (!isCurrentRequest()) return;
        console.error('Failed to load profile posts:', error);
        setAllPosts([]);
      } finally {
        if (isCurrentRequest()) setIsLoadingPosts(false);
      }
    },
    [canViewPosts, isAuthenticated, profile.id, viewedUserId]
  );

  useEffect(() => {
    // Capture the stable ref object, not its current counter. Cleanup
    // must increment the latest value to invalidate earlier requests.
    const refreshRunRefForCleanup = profilePostsRefreshRunRef;
    void loadProfilePosts({
      showLoading: true,
    });

    return () => {
      ++refreshRunRefForCleanup.current;
    };
  }, [loadProfilePosts]);

  const retryProfilePosts = useCallback(() => {
    void loadProfilePosts({
      showLoading: true,
    });
  }, [loadProfilePosts]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !viewedUserId
    ) {
      return;
    }

    return subscribeToTableChanges({
      channelName:
        `profile-collections-${viewedUserId}`,
      table: 'collections',
      filter:
        `user_id=eq.${viewedUserId}`,
      onChange: async () => {
        await loadProfilePosts();
      },
    });
  }, [
    isAuthenticated,
    loadProfilePosts,
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

  // Leave the existing Reanimated header handler untouched. These callbacks
  // run only when dragging ends or the available scroll height changes.
  const maybeRevealMoreProfileCards = useCallback(() => {
    if (isLoadingPosts || publishedPosts.length <= PROFILE_CARD_BATCH_SIZE) {
      return;
    }

    const { offsetY, viewportHeight, contentHeight } =
      profileScrollMetricsRef.current;
    if (viewportHeight <= 0 || contentHeight <= 0) {
      return;
    }
    if (
      offsetY + viewportHeight + PROFILE_CARD_LOAD_AHEAD_PX <
      contentHeight
    ) {
      return;
    }

    setVisiblePostCount((current) =>
      current >= publishedPosts.length
        ? current
        : Math.min(publishedPosts.length, current + PROFILE_CARD_BATCH_SIZE)
    );
  }, [isLoadingPosts, publishedPosts.length]);

  const handleProfileBatchScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      profileScrollMetricsRef.current = {
        offsetY: Math.max(0, contentOffset.y),
        viewportHeight: layoutMeasurement.height,
        contentHeight: contentSize.height,
      };
      maybeRevealMoreProfileCards();
    },
    [maybeRevealMoreProfileCards]
  );

  const tasteMatch = useMemo(() => {
    if (
      comparisonReadyForUserId !== viewedUserId ||
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
    comparisonReadyForUserId,
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
        collectionScope: 'specific',
        category: post.collection.category,
        topic: normalizeTopic(
          post.collection.topic
        ),
        ...(post.collection.type
          ? { type: post.collection.type }
          : {}),
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

  function openSaved() {
    if (!isCurrentUser) {
      return;
    }

    router.push('/saved');
  }

  function openCreateScreen() {
    if (!isCurrentUser) {
      return;
    }

    router.push('/top3');
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

      router.back();
    } catch (error) {
      console.error(
        'Failed to block user:',
        error
      );

      setModerationSheet({
        type: 'block-error',
      });
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

      setModerationSheet({
        type: 'unblock-success',
      });
    } catch (error) {
      console.error(
        'Failed to unblock user:',
        error
      );

      setModerationSheet({
        type: 'unblock-error',
      });
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

      setModerationSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report user:',
        error
      );

      setModerationSheet({
        type: 'report-error',
      });
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

      setModerationSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report list from profile:',
        error
      );

      setModerationSheet({
        type: 'report-error',
      });
    }
  }

  function openFollowing() {
    if (
      !viewedUserId ||
      !canViewSocialConnections
    ) {
      return;
    }

    router.push({
      pathname: '/social',
      params: {
        tab: 'following',
        userId: viewedUserId,
      },
    });
  }

  function openFollowers() {
    if (
      !viewedUserId ||
      !canViewSocialConnections
    ) {
      return;
    }

    router.push({
      pathname: '/social',
      params: {
        tab: 'followers',
        userId: viewedUserId,
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

  async function shareCollection(post: Post) {
    await sharePublishedCollection({
      postId: post.id,
      title: post.collection.title,
      source: 'profile',
    });
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

      case 'block-error':
        moderationSheetTitle =
          'Unable to block user';
        moderationSheetMessage =
          'Please try again.';

        moderationSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'unblock-success':
        moderationSheetTitle =
          'User unblocked';
        moderationSheetMessage =
          `${viewedUser.displayName} has been unblocked.`;

        moderationSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'unblock-error':
        moderationSheetTitle =
          'Unable to unblock user';
        moderationSheetMessage =
          'Please try again.';

        moderationSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'report-success':
        moderationSheetTitle =
          'Report submitted';
        moderationSheetMessage =
          'Thanks for letting us know. Your report has been submitted for review.';

        moderationSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeModerationSheet,
          },
        ];
        break;

      case 'report-error':
        moderationSheetTitle =
          'Unable to submit report';
        moderationSheetMessage =
          'Please try again.';

        moderationSheetActions = [
          {
            label: 'OK',
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
        style={[
          styles.container,
          {
            backgroundColor:
              colors.background,
          },
        ]}
        edges={['top', 'left', 'right']}>
        <ScreenHeader
          showBackButton={showBackButton}
        />

        <View style={styles.messageContainer}>
          <ActivityIndicator
            size="large"
            color={colors.text}
          />

          <AppText
            variant="bodyLarge"
            style={styles.loadingText}>
            Loading profile...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (!viewedUser) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor:
              colors.background,
          },
        ]}
        edges={['top', 'left', 'right']}>
        <ScreenHeader
          title="Profile Not Found"
          showBackButton={showBackButton}
        />

        <View style={styles.messageContainer}>
          <AppText
            variant="stateTitle"
            style={styles.messageTitle}>
            This profile is unavailable
          </AppText>

          <AppText
            variant="bodyLarge"
            style={styles.messageText}>
            The user may no longer exist or the
            profile could not be loaded.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
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
          stickyHeaderStyle,
        ]}>
        <ScreenHeader
          showBackButton={showBackButton}
          overlay
          scrolled={headerScrolled}
          floatingCircleStyle="tab-bar"
          floatingCircleScrollY={circleScrollY}
          featheredBackdrop
          androidStatusBarGlass
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
      </Reanimated.View>

      <Reanimated.ScrollView
        contentContainerStyle={[
          styles.content,
          {
            // Original padding was 44 + 20, below the iOS top SafeAreaView.
            // Compensate for the removed inset so the avatar doesn't jump.
            paddingTop: SCREEN_HEADER_HEIGHT + 20 +
              insets.top,
            paddingBottom: bottomScrollClearance,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={stickyScrollHandler}
        onScrollEndDrag={handleProfileBatchScrollEnd}
        onMomentumScrollEnd={handleProfileBatchScrollEnd}
        onLayout={(event) => {
          profileScrollMetricsRef.current.viewportHeight =
            event.nativeEvent.layout.height;
          maybeRevealMoreProfileCards();
        }}
        onContentSizeChange={(_width, height) => {
          profileScrollMetricsRef.current.contentHeight = height;
          maybeRevealMoreProfileCards();
        }}
        scrollEventThrottle={16}>
        <ProfileScreenContent
          user={viewedUser}
          publishedPosts={publishedPosts}
          visiblePostCount={visiblePostCount}
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
            tasteMatch?.sharedPickCount ?? 0
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
            canViewSocialConnections
              ? openFollowers
              : undefined
          }
          onFollowingPress={
            canViewSocialConnections
              ? openFollowing
              : undefined
          }
          isLoadingPosts={isLoadingPosts}
          hasPostsLoadError={hasPostsLoadError}
          onRetryPosts={retryProfilePosts}
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
          onCreateTop3={
            isCurrentUser
              ? openCreateScreen
              : undefined
          }
          onSavedPress={
            isCurrentUser
              ? openSaved
              : undefined
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
          onSharePost={(post) => {
            void shareCollection(post);
          }}
        />
      </Reanimated.ScrollView>

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
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: SCREEN_HEADER_HEIGHT + 20,
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
  },

  messageTitle: {
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    textAlign: 'center',
  },
});