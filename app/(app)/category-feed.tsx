import ActionSheet, {
  ActionSheetAction,
} from '@/components/action-sheet';
import AppText from '@/components/app-text';
import CommentsSheet from '@/components/comments-sheet';
import { MediaPreviewItemButton } from '@/components/media-preview-button';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import SegmentedControl from '@/components/segmented-control';
import Top3Card from '@/components/top3-card';
import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useBlock } from '@/context/block-context';
import { useComments } from '@/context/comment-context';
import { useLike } from '@/context/like-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  shareOverallCollection,
  sharePublishedCollection,
} from '@/lib/share';
import { getPublicProfilesByIds } from '@/lib/supabase/profiles';
import {
  createPostReport,
  createUserReport,
  ReportReason,
} from '@/lib/supabase/reports';
import {
  getPublishedPosts
} from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import {
  calculateCommunityTop3,
  CommunityTop3Result,
} from '@/utils/calculate-community-top3';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CategoryView = 'lists' | 'overall';

type CategoryFeedModerationSheet =
  | {
      type: 'actions';
      post: Post;
    }
  | {
      type: 'post-reasons';
      post: Post;
    }
  | {
      type: 'confirm-post';
      post: Post;
      reason: ReportReason;
      reasonLabel: string;
    }
  | {
      type: 'user-reasons';
      post: Post;
    }
  | {
      type: 'confirm-user';
      post: Post;
      reason: ReportReason;
      reasonLabel: string;
    }
  | {
      type: 'confirm-block';
      post: Post;
    }
  | {
      type: 'confirm-unblock';
      post: Post;
    }
  | {
      type: 'report-success';
    }
  | {
      type: 'report-error';
    }
  | {
      type: 'block-success';
      displayName: string;
    }
  | {
      type: 'block-error';
    }
  | {
      type: 'unblock-success';
      displayName: string;
    }
  | {
      type: 'unblock-error';
    }
  | null;


function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function formatTopicLabel(topic: string) {
  return topic
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

export default function CategoryFeedScreen() {
  const colors = useAppColors();
  const params = useLocalSearchParams<{
    category?: string | string[];
    topic?: string | string[];
    itemQuery?: string | string[];
    itemId?: string | string[];
    view?: string | string[];
  }>();

  const categoryId = Array.isArray(
    params.category
  )
    ? params.category[0]
    : params.category;

  const topicParam = Array.isArray(
    params.topic
  )
    ? params.topic[0]
    : params.topic;

  const itemQueryParam = Array.isArray(
    params.itemQuery
  )
    ? params.itemQuery[0]
    : params.itemQuery;

  const itemIdParam = Array.isArray(
    params.itemId
  )
    ? params.itemId[0]
    : params.itemId;

  const viewParam = Array.isArray(
    params.view
  )
    ? params.view[0]
    : params.view;

  const normalizedTopic =
    normalizeValue(topicParam) || 'general';

  const normalizedItemQuery =
    normalizeValue(itemQueryParam);

  const normalizedItemId =
    normalizeValue(itemIdParam);

  const isItemFiltered =
    Boolean(
      normalizedItemId ||
      normalizedItemQuery
    );

  const itemFilterLabel =
    itemQueryParam?.trim() ?? '';

  const { profile } = useProfile();

  const {
    blockedUserIds,
    isBlocked,
    blockUser,
    unblockUser,
  } = useBlock();

  const {
    posts,
  } = useTop3();

  const {
    isLiked,
    toggleLike,
    getLikeCount,
    isLoading: isLoadingLikes,
  } = useLike();

  const {
    getCommentCount,
    isLoading: isLoadingComments,
  } = useComments();

  const [allPosts, setAllPosts] = useState<
    Post[]
  >([]);

  const [profilesByUserId, setProfilesByUserId] =
  useState<Record<string, UserProfile>>({});

  const [isLoading, setIsLoading] =
    useState(true);

  const [activeView, setActiveView] =
    useState<CategoryView>(
      isItemFiltered
        ? 'lists'
        : normalizeValue(viewParam) === 'overall'
          ? 'overall'
          : 'lists'
    );

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  const [
    moderationSheet,
    setModerationSheet,
  ] = useState<CategoryFeedModerationSheet>(
    null
  );

  useEffect(() => {
    setActiveView(
      isItemFiltered
        ? 'lists'
        : normalizeValue(viewParam) === 'overall'
          ? 'overall'
          : 'lists'
    );
  }, [viewParam, isItemFiltered]);

  const category = TOP3_CATEGORIES.find(
    (item) =>
      normalizeValue(item.id) ===
      normalizeValue(categoryId)
  );

  const [hasLoadError, setHasLoadError] =
    useState(false);

  const [loadAttempt, setLoadAttempt] =
    useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setHasLoadError(false);

      try {
        const publishedPosts =
  await getPublishedPosts();

  const authorProfiles =
  await getPublicProfilesByIds(
    publishedPosts.map((post) => post.authorId)
  );

const nextProfilesByUserId =
  Object.fromEntries(
    authorProfiles.map((authorProfile) => [
      authorProfile.id,
      authorProfile,
    ])
  );

if (isMounted) {
  setAllPosts(publishedPosts);
  setProfilesByUserId(nextProfilesByUserId);
}
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load category feed:',
            error
          );
        }

        if (isMounted) {
          setAllPosts(posts);
          setHasLoadError(posts.length === 0);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, [posts, loadAttempt]);

  const filteredPosts = useMemo(() => {
    if (!categoryId) {
      return [];
    }

    const normalizedCategory =
      normalizeValue(categoryId);

    return allPosts
      .filter((post) => {
        if (
          post.authorId !== profile.id &&
          blockedUserIds.includes(post.authorId)
        ) {
          return false;
        }

        const postCategory =
          normalizeValue(
            post.collection.category
          );

        if (
          postCategory !== normalizedCategory
        ) {
          return false;
        }

        const postTopic =
          normalizeValue(
            post.collection.topic
          ) || 'general';

        const topicMatches =
          normalizedTopic === 'general'
            ? postTopic === 'general'
            : postTopic === normalizedTopic;

        if (!topicMatches) {
          return false;
        }

        if (
          !normalizedItemId &&
          !normalizedItemQuery
        ) {
          return true;
        }

        return post.collection.items.some(
          (item) => {
            if (!item) {
              return false;
            }

            if (normalizedItemId) {
              return (
                normalizeValue(item.id) ===
                normalizedItemId
              );
            }

            const searchableItem =
              normalizeValue(
                `${item.title} ${
                  item.subtitle ?? ''
                }`
              );

            return searchableItem.includes(
              normalizedItemQuery
            );
          }
        );
      })
      .sort(
        (first, second) =>
          new Date(
            second.publishedAt
          ).getTime() -
          new Date(
            first.publishedAt
          ).getTime()
      );
  }, [
    allPosts,
    blockedUserIds,
    categoryId,
    normalizedTopic,
    normalizedItemId,
    normalizedItemQuery,
    profile.id,
  ]);

  const overallResult = useMemo<
    CommunityTop3Result | null
  >(() => {
    if (!categoryId) {
      return null;
    }

    return calculateCommunityTop3(
      filteredPosts,
      {
        category: categoryId,
        topic: normalizedTopic,
      }
    );
  }, [
    filteredPosts,
    categoryId,
    normalizedTopic,
  ]);

  const communityPost = useMemo<Post | null>(
    () => {
      if (!overallResult || !categoryId) {
        return null;
      }

      const normalizedCategory =
        normalizeValue(categoryId);

      const queryKey = normalizedItemQuery
        ? `-${normalizedItemQuery.replace(
            /[^a-z0-9]+/g,
            '-'
          )}`
        : '';

      const postId =
        `community-${normalizedCategory}-` +
        `${normalizedTopic}${queryKey}`;

      const items: Post['collection']['items'] =
        [
          overallResult.items[0]?.item ?? null,
          overallResult.items[1]?.item ?? null,
          overallResult.items[2]?.item ?? null,
        ];

      const title =
        normalizedTopic === 'general'
          ? category?.name ??
            overallResult.category
          : `${
              category?.name ??
              overallResult.category
            } • ${formatTopicLabel(
              topicParam ?? normalizedTopic
            )}`;

      const stableDate =
        new Date(0).toISOString();

      return {
        id: postId,
        authorId: 'community',
        collection: {
          id: postId,
          category: categoryId,
          topic:
            normalizedTopic === 'general'
              ? undefined
              : normalizedTopic,
          title,
          items,
          createdAt: stableDate,
          updatedAt: stableDate,
          publishedAt: stableDate,
        },
        publishedAt: stableDate,
        reactions: 0,
        comments: 0,
      };
    },
    [
      overallResult,
      categoryId,
      category?.name,
      normalizedTopic,
      normalizedItemQuery,
      topicParam,
    ]
  );

  const communityIsLiked = communityPost
    ? isLiked(communityPost.id)
    : false;

  const displayedCommunityLikeCount =
    communityPost
      ? getLikeCount(
          communityPost.id,
          communityPost.reactions
        )
      : 0;

  const displayedCommunityCommentCount =
    communityPost
      ? getCommentCount(
          communityPost.id,
          communityPost.comments
        )
      : 0;

  const communityHasComments =
    displayedCommunityCommentCount > 0;

 function getPostAuthor(
  authorId: string
): UserProfile | null {
  if (authorId === profile.id) {
    return profile;
  }

  return (
    profilesByUserId[authorId] ?? null
  );
}

  function openAuthorProfile(
    authorId: string
  ) {
    if (authorId === profile.id) {
      router.push('/profile');
      return;
    }

    router.push({
      pathname: '/public-profile',
      params: {
        userId: authorId,
      },
    });
  }

  function openPost(post: Post) {
    router.push({
      pathname: '/published-top3',
      params: {
        postId: post.id,
      },
    });
  }

  function openListsForOverallItem(
    item: CommunityTop3Result['items'][number]['item']
  ) {
    if (!categoryId) {
      return;
    }

    router.push({
      pathname: '/category-feed',
      params: {
        category: categoryId,
        ...(normalizedTopic !== 'general'
          ? { topic: normalizedTopic }
          : {}),
        itemId: item.id,
        itemQuery: item.title,
        view: 'lists',
      },
    });
  }

  function editCollection(post: Post) {
    router.push({
      pathname: '/collection',
      params: {
        listId: post.collection.id,
      },
    });
  }

  function openComments(post: Post) {
    setSelectedCommentsPost(post);
  }

  async function shareCollection(post: Post) {
    await sharePublishedCollection({
      postId: post.id,
      title: post.collection.title,
      source: 'category_feed',
    });
  }

  function closeComments() {
    setSelectedCommentsPost(null);
  }

  function closeModerationSheet() {
    setModerationSheet(null);
  }

  function openPostActions(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setModerationSheet({
      type: 'actions',
      post,
    });
  }

  function openReportPostReasons(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setModerationSheet({
      type: 'post-reasons',
      post,
    });
  }

  function confirmPostReport(
    post: Post,
    reason: ReportReason,
    reasonLabel: string
  ) {
    if (post.authorId === profile.id) {
      return;
    }

    setModerationSheet({
      type: 'confirm-post',
      post,
      reason,
      reasonLabel,
    });
  }

  function openReportUserReasons(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setModerationSheet({
      type: 'user-reasons',
      post,
    });
  }

  function confirmUserReport(
    post: Post,
    reason: ReportReason,
    reasonLabel: string
  ) {
    if (post.authorId === profile.id) {
      return;
    }

    setModerationSheet({
      type: 'confirm-user',
      post,
      reason,
      reasonLabel,
    });
  }

  function confirmBlockUser(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setModerationSheet({
      type: 'confirm-block',
      post,
    });
  }

  function confirmUnblockUser(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setModerationSheet({
      type: 'confirm-unblock',
      post,
    });
  }

  async function handleReportPost(
    post: Post,
    reason: ReportReason
  ) {
    if (post.authorId === profile.id) {
      return;
    }

    try {
      await createPostReport({
        reporterId: profile.id,
        reportedUserId: post.authorId,
        reportedPostId: post.id,
        reason,
      });

      setModerationSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report list from category feed:',
        error
      );

      setModerationSheet({
        type: 'report-error',
      });
    }
  }

  async function handleReportUser(
    post: Post,
    reason: ReportReason
  ) {
    if (post.authorId === profile.id) {
      return;
    }

    try {
      await createUserReport({
        reporterId: profile.id,
        reportedUserId: post.authorId,
        reason,
      });

      setModerationSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report user from category feed:',
        error
      );

      setModerationSheet({
        type: 'report-error',
      });
    }
  }

  async function handleBlockUser(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    try {
      await blockUser(post.authorId);

      const author =
        getPostAuthor(post.authorId);

      setModerationSheet({
        type: 'block-success',
        displayName:
          author?.displayName ?? 'This user',
      });
    } catch (error) {
      console.error(
        'Failed to block user from category feed:',
        error
      );

      setModerationSheet({
        type: 'block-error',
      });
    }
  }

  async function handleUnblockUser(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    try {
      await unblockUser(post.authorId);

      const author =
        getPostAuthor(post.authorId);

      setModerationSheet({
        type: 'unblock-success',
        displayName:
          author?.displayName ?? 'This user',
      });
    } catch (error) {
      console.error(
        'Failed to unblock user from category feed:',
        error
      );

      setModerationSheet({
        type: 'unblock-error',
      });
    }
  }

  let moderationSheetTitle:
    | string
    | undefined;
  let moderationSheetMessage:
    | string
    | undefined;
  let moderationSheetActions:
    ActionSheetAction[] = [];

  if (moderationSheet) {
    switch (moderationSheet.type) {
      case 'actions': {
        const userIsBlocked =
          isBlocked(
            moderationSheet.post.authorId
          );

        moderationSheetActions = [
          {
            label: 'Report List',
            onPress: () =>
              openReportPostReasons(
                moderationSheet.post
              ),
          },
          {
            label: 'Report User',
            onPress: () =>
              openReportUserReasons(
                moderationSheet.post
              ),
          },
          {
            label: userIsBlocked
              ? 'Unblock User'
              : 'Block User',
            variant: userIsBlocked
              ? 'default'
              : 'destructive',
            onPress: userIsBlocked
              ? () =>
                  confirmUnblockUser(
                    moderationSheet.post
                  )
              : () =>
                  confirmBlockUser(
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
      }

      case 'post-reasons':
        moderationSheetTitle =
          'Report List';
        moderationSheetMessage =
          'Why are you reporting this list?';

        moderationSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmPostReport(
                moderationSheet.post,
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmPostReport(
                moderationSheet.post,
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmPostReport(
                moderationSheet.post,
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmPostReport(
                moderationSheet.post,
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmPostReport(
                moderationSheet.post,
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmPostReport(
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

      case 'confirm-post':
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
              void handleReportPost(
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

      case 'user-reasons':
        moderationSheetTitle =
          'Report User';
        moderationSheetMessage =
          'Why are you reporting this user?';

        moderationSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmUserReport(
                moderationSheet.post,
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmUserReport(
                moderationSheet.post,
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmUserReport(
                moderationSheet.post,
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmUserReport(
                moderationSheet.post,
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmUserReport(
                moderationSheet.post,
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmUserReport(
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

      case 'confirm-user': {
        const author =
          getPostAuthor(
            moderationSheet.post.authorId
          );

        moderationSheetTitle =
          `Report ${author?.displayName ?? 'this user'}?`;
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
              void handleReportUser(
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

      case 'confirm-block': {
        const author =
          getPostAuthor(
            moderationSheet.post.authorId
          );

        moderationSheetTitle =
          `Block ${author?.displayName ?? 'this user'}?`;
        moderationSheetMessage =
          'They will no longer be connected to you through following, and you can unblock them later.';

        moderationSheetActions = [
          {
            label: 'Block',
            variant: 'destructive',
            onPress: () => {
              const post =
                moderationSheet.post;

              closeModerationSheet();
              void handleBlockUser(post);
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

      case 'confirm-unblock': {
        const author =
          getPostAuthor(
            moderationSheet.post.authorId
          );

        moderationSheetTitle =
          `Unblock ${author?.displayName ?? 'this user'}?`;
        moderationSheetMessage =
          'You can follow each other again after unblocking.';

        moderationSheetActions = [
          {
            label: 'Unblock',
            onPress: () => {
              const post =
                moderationSheet.post;

              closeModerationSheet();
              void handleUnblockUser(post);
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

      case 'block-success':
        moderationSheetTitle = 'User blocked';
        moderationSheetMessage =
          `${moderationSheet.displayName} has been blocked.`;

        moderationSheetActions = [
          {
            label: 'OK',
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
        moderationSheetTitle = 'User unblocked';
        moderationSheetMessage =
          `${moderationSheet.displayName} has been unblocked.`;

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
    }
  }

  function handleCommunityLike() {
    if (
      !communityPost ||
      isLoadingLikes
    ) {
      return;
    }

    toggleLike(communityPost.id);
  }

  function openCommunityComments() {
    if (!communityPost) {
      return;
    }

    setSelectedCommentsPost(
      communityPost
    );
  }

  async function shareOverallList() {
    if (!categoryId) {
      return;
    }

    await shareOverallCollection({
      category: categoryId,
      topic:
        normalizedTopic === 'general'
          ? undefined
          : normalizedTopic,
      title: overallTitle,
      source: 'overall',
    });
  }


  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.loadingState}>
          <ActivityIndicator
            size="small"
            color={colors.text}
          />

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.loadingText}>
            Loading published Top 3s…
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (hasLoadError) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.messageState}>
          <AppText
            variant="stateTitle"
            style={styles.messageTitle}>
            Couldn’t load this feed
          </AppText>

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.messageText}>
            Check your connection and try again.
          </AppText>

          <PrimaryButton
            title="Try Again"
            onPress={() =>
              setLoadAttempt((current) => current + 1)
            }
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!categoryId || !category) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.messageState}>
          <AppText
            variant="stateTitle"
            style={styles.messageTitle}>
            Category unavailable
          </AppText>

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.messageText}>
            This category could not be found.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const isTopicFeed =
    normalizedTopic !== 'general';

  const topicLabel = isTopicFeed
    ? formatTopicLabel(
        topicParam ?? normalizedTopic
      )
    : null;

  const overallTitle = topicLabel
    ? `${category.name} • ${topicLabel}`
    : `All ${category.name}`;

  const artworkRule =
    getCategoryArtworkRule(
      category.id
    );

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      {isItemFiltered ? (
        <View style={styles.filteredHeader}>
          <AppText
            variant="label"
            tone="tertiary"
            style={styles.filteredEyebrow}>
            Lists containing
          </AppText>

          <AppText
            variant="pageTitle"
            style={styles.filteredTitle}>
            {itemFilterLabel || 'This item'}
          </AppText>
        </View>
      ) : (
        <View
          style={[
            styles.segmentedContainer,
            {
              backgroundColor: colors.background,
            },
          ]}>
          <SegmentedControl<CategoryView>
            value={activeView}
            options={[
              {
                value: 'lists',
                label: 'Lists',
                accessibilityLabel:
                  'Show published lists',
              },
              {
                value: 'overall',
                label: 'Overall',
                accessibilityLabel:
                  'Show overall ranking',
              },
            ]}
            onChange={setActiveView}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isItemFiltered &&
            styles.filteredContent,
        ]}
        showsVerticalScrollIndicator={false}>
        {activeView === 'lists' ? (
          filteredPosts.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surface,
                },
              ]}>
              <AppText
                variant="sectionTitle"
                style={styles.emptyTitle}>
                {normalizedItemQuery
                  ? 'No matching Top 3s'
                  : 'Nothing published yet'}
              </AppText>

              <AppText
                variant="body"
                tone="tertiary"
                style={styles.emptyText}>
                {normalizedItemQuery
                  ? `No published lists here contain “${
                      itemQueryParam?.trim() ?? ''
                    }”.`
                  : 'Published Top 3 lists in this category and topic will appear here.'}
              </AppText>
            </View>
          ) : (
            <View style={styles.postList}>
              {filteredPosts.map((post) => {
                const author = getPostAuthor(
                  post.authorId
                );

                if (!author) {
                  return null;
                }

                const isCurrentUserPost =
                  post.authorId === profile.id;

                return (
                  <Top3Card
                    key={post.id}
                    post={post}
                    author={author}
                    showAuthor
                    highlightQuery={itemQueryParam}
                    onAuthorPress={() =>
                      openAuthorProfile(
                        post.authorId
                      )
                    }
                    onPress={() =>
                      openPost(post)
                    }
                    onEditPress={
                      isCurrentUserPost
                        ? () =>
                            editCollection(post)
                        : undefined
                    }
                    onMorePress={
                      !isCurrentUserPost
                        ? () =>
                            openPostActions(post)
                        : undefined
                    }
                    onCommentsPress={() =>
                      openComments(post)
                    }
                    onSharePress={() => {
                      void shareCollection(post);
                    }}
                  />
                );
              })}
            </View>
          )
        ) : !overallResult ||
          overallResult.items.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <AppText
              variant="sectionTitle"
              style={styles.emptyTitle}>
              Not enough rankings yet
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyText}>
              Publish matching Top 3 lists to
              build the overall ranking.
            </AppText>
          </View>
        ) : (
          <View
            style={[
              styles.overallCard,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <View style={styles.overallTitleRow}>
              <Text
                style={
                  styles.overallCategoryIcon
                }>
                {category.icon}
              </Text>

              <AppText
                variant="collectionTitle"
                style={styles.overallCardTitle}>
                {overallTitle}
              </AppText>
            </View>

            <View style={styles.rankingContent}>
              {overallResult.items.map(
                (entry, index) => (
                  <View
                    key={entry.item.id}
                    style={[
                      styles.rankRow,
                      {
                        backgroundColor:
                          colors.background,
                      },
                      index <
                        overallResult.items.length - 1 &&
                        styles.rankDivider,
                    ]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.rankItemLink,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        openListsForOverallItem(
                          entry.item
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Show published lists containing ${entry.item.title}`}>
                      <AppText
                        variant="compactRankNumber"
                        style={styles.rankNumber}>
                        {index + 1}
                      </AppText>

                      <View
                        style={[
                          styles.artworkContainer,
                          {
                            width: artworkRule.width,
                            height: artworkRule.height,
                          },
                        ]}>
                        {entry.item.imageUrl ? (
                          <Image
                            source={{
                              uri: entry.item.imageUrl,
                            }}
                            style={[
                              styles.itemImage,
                              {
                                width: artworkRule.width,
                                height: artworkRule.height,
                                backgroundColor:
                                  colors.skeletonSubtle,
                              },
                            ]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.imagePlaceholder,
                              {
                                width: artworkRule.width,
                                height: artworkRule.height,
                                backgroundColor:
                                  colors.secondarySurface,
                              },
                            ]}>
                            <AppText
                              variant="artworkInitial"
                              tone="tertiary">
                              {entry.item.title
                                .charAt(0)
                                .toUpperCase()}
                            </AppText>
                          </View>
                        )}
                      </View>

                      <View
                        style={styles.itemDetails}>
                        <AppText
                          variant="cardTitle"
                          numberOfLines={2}
                          ellipsizeMode="tail">
                          {entry.item.title}
                        </AppText>

                        {entry.item.subtitle ? (
                          <AppText
                            variant="subtitle"
                            tone="secondary"
                            style={styles.itemSubtitle}
                            numberOfLines={1}
                            ellipsizeMode="tail">
                            {entry.item.subtitle}
                          </AppText>
                        ) : null}

                        {typeof entry.item.rating ===
                        'number' ? (
                          <View
                            style={styles.ratingRow}>
                            <AppText
                              variant="metadata"
                              tone="secondary"
                              emphasis="semibold"
                              style={styles.ratingText}>
                              {entry.item.rating.toFixed(1)}
                            </AppText>

                            <Ionicons
                              name="star"
                              size={13}
                              color={colors.secondaryText}
                            />
                          </View>
                        ) : null}

                        <AppText
                          variant="metadata"
                          tone="tertiary"
                          style={styles.scoreText}
                          numberOfLines={1}>
                          {entry.score}{' '}
                          {entry.score === 1
                            ? 'point'
                            : 'points'}{' '}
                          · {entry.appearanceCount}{' '}
                          {entry.appearanceCount === 1
                            ? 'list'
                            : 'lists'}
                        </AppText>
                      </View>
                    </Pressable>

                    <MediaPreviewItemButton
                      item={entry.item}
                      category={category.id}
                      saveContext={{
                        category: category.id,
                        source: {
                          topic: normalizedTopic,
                        },
                      }}
                      style={[
                        styles.previewButton,
                        {
                          backgroundColor: colors.surface,
                        },
                      ]}
                      checkTrailerAvailability={false}
                    />
                  </View>
                )
              )}
            </View>

            <View style={styles.overallFooter}>
              <View style={styles.sourceItem}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={colors.tertiaryText}
                />

                <AppText
                  variant="metadata"
                  tone="tertiary"
                  style={styles.footerText}>
                  Based on{' '}
                  {overallResult.totalLists}{' '}
                  {overallResult.totalLists === 1
                    ? 'published list'
                    : 'published lists'}
                </AppText>
              </View>

              <View style={styles.engagement}>
                <Pressable
                  style={({ pressed }) => [
                    styles.engagementButton,
                    pressed && styles.pressed,
                    isLoadingLikes &&
                      styles.disabled,
                  ]}
                  onPress={handleCommunityLike}
                  disabled={
                    !communityPost ||
                    isLoadingLikes
                  }
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected:
                      communityIsLiked,
                    disabled:
                      !communityPost ||
                      isLoadingLikes,
                  }}
                  accessibilityLabel={
                    communityIsLiked
                      ? `Unlike ${overallTitle}`
                      : `Like ${overallTitle}`
                  }>
                  <Ionicons
                    name={
                      communityIsLiked
                        ? 'heart'
                        : 'heart-outline'
                    }
                    size={17}
                    color={
                      communityIsLiked
                        ? colors.heart
                        : colors.tertiaryText
                    }
                  />

                  <AppText
                    variant="metadata"
                    tone={
                      communityIsLiked
                        ? 'primary'
                        : 'tertiary'
                    }
                    emphasis={
                      communityIsLiked
                        ? 'semibold'
                        : 'default'
                    }
                    style={styles.engagementText}>
                    {
                      displayedCommunityLikeCount
                    }
                  </AppText>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.engagementButton,
                    pressed && styles.pressed,
                    isLoadingComments &&
                      styles.disabled,
                  ]}
                  onPress={
                    openCommunityComments
                  }
                  disabled={
                    !communityPost ||
                    isLoadingComments
                  }
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled:
                      !communityPost ||
                      isLoadingComments,
                  }}
                  accessibilityLabel={`Open comments for ${overallTitle}`}>
                  <Ionicons
                    name={
                      communityHasComments
                        ? 'chatbubble'
                        : 'chatbubble-outline'
                    }
                    size={15}
                    color={
                      communityHasComments
                        ? colors.text
                        : colors.tertiaryText
                    }
                  />

                  <AppText
                    variant="metadata"
                    tone={
                      communityHasComments
                        ? 'primary'
                        : 'tertiary'
                    }
                    emphasis={
                      communityHasComments
                        ? 'semibold'
                        : 'default'
                    }
                    style={styles.engagementText}>
                    {
                      displayedCommunityCommentCount
                    }
                  </AppText>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.engagementButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    void shareOverallList();
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${overallTitle}`}>
                  <Ionicons
                    name="share-outline"
                    size={17}
                    color={colors.tertiaryText}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        )}
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
  },

  segmentedContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },

  filteredHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  filteredEyebrow: {
    marginBottom: 4,
  },

  filteredTitle: {
    maxWidth: '100%',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },

  filteredContent: {
    paddingTop: 0,
  },

  postList: {
    gap: 16,
  },

  overallCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },

  overallTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },

  overallCategoryIcon: {
    marginRight: 9,
    fontSize: 22,
  },

  overallCardTitle: {
    flex: 1,
  },

  rankingContent: {
    paddingHorizontal: 18,
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderRadius: 12,
  },

  rankDivider: {
    marginBottom: 8,
  },

  rankItemLink: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  rankNumber: {
    width: 28,
  },

  artworkContainer: {
    position: 'relative',
    marginRight: 13,
  },

  itemImage: {
    borderRadius: 9,
  },

  imagePlaceholder: {
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewButton: {
    marginLeft: 10,
  },

  itemDetails: {
    flex: 1,
    minWidth: 0,
  },

  itemSubtitle: {
    marginTop: 4,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  ratingText: {
    marginRight: 4,
  },

  scoreText: {
    marginTop: 4,
  },

  overallFooter: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 13,
  },

  sourceItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },

  footerText: {
    flexShrink: 1,
    marginLeft: 6,
  },

  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  engagementButton: {
    minWidth: 38,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  engagementText: {
    marginLeft: 5,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 18,
  },

  emptyTitle: {},

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 90,
  },

  loadingText: {
    marginTop: 10,
  },

  messageState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 90,
    paddingHorizontal: 24,
  },

  messageTitle: {
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },

  pressed: {
    opacity: 0.68,
  },

  disabled: {
    opacity: 0.5,
  },
});