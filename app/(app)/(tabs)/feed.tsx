import ActionSheet, {
  ActionSheetAction,
} from '@/components/action-sheet';
import AppText from '@/components/app-text';
import CommentsSheet from '@/components/comments-sheet';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useBlock } from '@/context/block-context';
import { useComments } from '@/context/comment-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { sharePublishedCollection } from '@/lib/share';
import { getProfilesByIds } from '@/lib/supabase/profiles';
import {
  createPostReport,
  createUserReport,
  ReportReason,
} from '@/lib/supabase/reports';
import {
  getPublishedPosts,
  hydrateMissingArtworkInPosts,
} from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { buildPersonalizedFeed } from '@/utils/build-personalized-feed';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function normalizeTopic(topic?: string) {
  return topic?.trim().toLowerCase() || 'general';
}


function formatSuggestionReason(
  suggestionReason?: string
) {
  if (!suggestionReason) {
    return 'Because this matches your taste';
  }

  const formattedReason = suggestionReason.replace(
    /^Suggested because\s+/i,
    ''
  );

  if (
    /^You both ranked\s+/i.test(
      formattedReason
    )
  ) {
    return `Because ${formattedReason
      .charAt(0)
      .toLowerCase()}${formattedReason.slice(1)}`;
  }

  return formattedReason;
}

type FeedReportSheet =
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

export default function FeedScreen() {
  const colors = useAppColors();
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();

  const { profile } = useProfile();

  const {
    blockedUserIds,
    isBlocked,
    blockUser,
    unblockUser,
  } = useBlock();

  const {
    followedUserIds,
    isFollowing,
    toggleFollow,
    isLoading: isLoadingFollowState,
  } = useFollow();

  const {
    posts,
  } = useTop3();

  const postsRef =
    useRef(posts);

  postsRef.current = posts;

  const { loadCommentCounts } =
    useComments();

  const [feedPosts, setFeedPosts] = useState<
    Post[]
  >([]);

  const [feedAuthors, setFeedAuthors] =
    useState<Record<string, UserProfile>>({});

  const [isLoadingFeed, setIsLoadingFeed] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const artworkHydrationRunRef =
    useRef(0);


  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  const [
    reportSheet,
    setReportSheet,
  ] = useState<FeedReportSheet>(null);

  function hydrateFeedArtworkInBackground(
    sourcePosts: Post[]
  ) {
    const hydrationRun =
      ++artworkHydrationRunRef.current;

    void hydrateMissingArtworkInPosts(
      sourcePosts
    )
      .then((hydratedPosts) => {
        if (
          hydrationRun !==
          artworkHydrationRunRef.current
        ) {
          return;
        }

        setFeedPosts(
          hydratedPosts
        );
      })
      .catch((error) => {
        if (__DEV__) {
          console.log(
            'Failed to hydrate feed artwork:',
            error
          );
        }
      });
  }

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setFeedPosts([]);
      setFeedAuthors({});
      setIsLoadingFeed(false);
      return;
    }

    if (!profile.id) {
      return;
    }

    let isMounted = true;

    async function loadFeedPosts() {
      setIsLoadingFeed(true);

      try {
        const nextPosts =
          await getPublishedPosts({
            hydrateMissingArtwork: false,
          });

        const authorIds = Array.from(
          new Set(
            nextPosts
              .map((post) => post.authorId)
              .filter(
                (authorId) =>
                  authorId !== profile.id
              )
          )
        );

        const authors =
          await getProfilesByIds(
            authorIds
          );

        const nextFeedAuthors =
          authors.reduce<
            Record<string, UserProfile>
          >((authorMap, author) => {
            authorMap[author.id] = author;

            return authorMap;
          }, {});

        if (isMounted) {
          setFeedPosts(nextPosts);
          setFeedAuthors(nextFeedAuthors);

          hydrateFeedArtworkInBackground(
            nextPosts
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load feed posts:',
            error
          );
        }

        if (isMounted) {
          setFeedPosts(
            postsRef.current
          );
          setFeedAuthors({});
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeed(false);
        }
      }
    }

    void loadFeedPosts();

    return () => {
      isMounted = false;
    };
  }, [
    isAuthenticated,
    isAuthLoading,
    profile.id,
  ]);

  const visibleFeedPosts = useMemo(
    () =>
      feedPosts.filter(
        (post) =>
          post.authorId === profile.id ||
          !blockedUserIds.includes(post.authorId)
      ),
    [
      feedPosts,
      blockedUserIds,
      profile.id,
    ]
  );

  const personalizedFeed = useMemo(
    () =>
      buildPersonalizedFeed({
        posts: visibleFeedPosts,
        profilesByUserId: feedAuthors,
        currentUserId: profile.id,
        followedUserIds,
      }),
    [
      visibleFeedPosts,
      feedAuthors,
      followedUserIds,
      profile.id,
    ]
  );

  const feedCollectionIds = useMemo(
    () =>
      Array.from(
        new Set(
          personalizedFeed.map(
            ({ post }) =>
              post.collection.id
          )
        )
      ),
    [personalizedFeed]
  );

  const feedCollectionIdsKey = useMemo(
    () =>
      [...feedCollectionIds]
        .sort()
        .join('|'),
    [feedCollectionIds]
  );

  useEffect(() => {
    if (
      isLoadingFeed ||
      !feedCollectionIdsKey
    ) {
      return;
    }

    const collectionIds =
      feedCollectionIdsKey.split('|');

    void loadCommentCounts(collectionIds);
  }, [
    isLoadingFeed,
    feedCollectionIdsKey,
    loadCommentCounts,
  ]);

  function getPostAuthor(
    authorId: string
  ): UserProfile | null {
    if (authorId === profile.id) {
      return profile;
    }

    return feedAuthors[authorId] ?? null;
  }

  function openAuthorProfile(
    authorId: string
  ) {
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

  function openCreateScreen() {
    router.push('/top3');
  }

  function openCollectionFeed(post: Post) {
    router.push({
      pathname: '/category-feed',
      params: {
        category:
          post.collection.category,
        topic: normalizeTopic(
          post.collection.topic
        ),
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
      source: 'feed',
    });
  }

  function closeComments() {
    setSelectedCommentsPost(null);
  }

  function closeReportSheet() {
    setReportSheet(null);
  }

  function openPostActions(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
      type: 'actions',
      post,
    });
  }

  function openReportPostReasons(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
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

    setReportSheet({
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

    setReportSheet({
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

    setReportSheet({
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

    setReportSheet({
      type: 'confirm-block',
      post,
    });
  }

  function confirmUnblockUser(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
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

      setReportSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report Top 3 from feed:',
        error
      );

      setReportSheet({
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

      setReportSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report user from feed:',
        error
      );

      setReportSheet({
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

      setReportSheet({
        type: 'block-success',
        displayName:
          author?.displayName ?? 'This user',
      });
    } catch (error) {
      console.error(
        'Failed to block user from feed:',
        error
      );

      setReportSheet({
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

      setReportSheet({
        type: 'unblock-success',
        displayName:
          author?.displayName ?? 'This user',
      });
    } catch (error) {
      console.error(
        'Failed to unblock user from feed:',
        error
      );

      setReportSheet({
        type: 'unblock-error',
      });
    }
  }

  let reportSheetTitle:
    | string
    | undefined;
  let reportSheetMessage:
    | string
    | undefined;
  let reportSheetActions:
    ActionSheetAction[] = [];

  if (reportSheet) {
    switch (reportSheet.type) {
      case 'actions': {
        const userIsBlocked =
          isBlocked(
            reportSheet.post.authorId
          );

        reportSheetActions = [
          {
            label: 'Report List',
            onPress: () =>
              openReportPostReasons(
                reportSheet.post
              ),
          },
          {
            label: 'Report User',
            onPress: () =>
              openReportUserReasons(
                reportSheet.post
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
                    reportSheet.post
                  )
              : () =>
                  confirmBlockUser(
                    reportSheet.post
                  ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
      }

      case 'post-reasons':
        reportSheetTitle =
          'Report List';
        reportSheetMessage =
          'Why are you reporting this list?';

        reportSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'other',
                'Other'
              ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'confirm-post':
        reportSheetTitle =
          'Report this list?';
        reportSheetMessage =
          `Reason: ${reportSheet.reasonLabel}`;

        reportSheetActions = [
          {
            label: 'Submit Report',
            variant: 'destructive',
            onPress: () => {
              const {
                post,
                reason,
              } = reportSheet;

              void handleReportPost(
                post,
                reason
              );
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'user-reasons':
        reportSheetTitle =
          'Report User';
        reportSheetMessage =
          'Why are you reporting this user?';

        reportSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'other',
                'Other'
              ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'confirm-user': {
        const author =
          getPostAuthor(
            reportSheet.post.authorId
          );

        reportSheetTitle =
          `Report ${author?.displayName ?? 'this user'}?`;
        reportSheetMessage =
          `Reason: ${reportSheet.reasonLabel}`;

        reportSheetActions = [
          {
            label: 'Submit Report',
            variant: 'destructive',
            onPress: () => {
              const {
                post,
                reason,
              } = reportSheet;

              void handleReportUser(
                post,
                reason
              );
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
      }

      case 'confirm-block': {
        const author =
          getPostAuthor(
            reportSheet.post.authorId
          );

        reportSheetTitle =
          `Block ${author?.displayName ?? 'this user'}?`;
        reportSheetMessage =
          'They will no longer be connected to you through following, and you can unblock them later.';

        reportSheetActions = [
          {
            label: 'Block',
            variant: 'destructive',
            onPress: () => {
              const post =
                reportSheet.post;

              closeReportSheet();
              void handleBlockUser(post);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
      }

      case 'confirm-unblock': {
        const author =
          getPostAuthor(
            reportSheet.post.authorId
          );

        reportSheetTitle =
          `Unblock ${author?.displayName ?? 'this user'}?`;
        reportSheetMessage =
          'You can follow each other again after unblocking.';

        reportSheetActions = [
          {
            label: 'Unblock',
            onPress: () => {
              const post =
                reportSheet.post;

              closeReportSheet();
              void handleUnblockUser(post);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
      }

      case 'report-success':
        reportSheetTitle =
          'Report submitted';
        reportSheetMessage =
          'Thanks for letting us know. Your report has been submitted for review.';

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'report-error':
        reportSheetTitle =
          'Unable to submit report';
        reportSheetMessage =
          'Please try again.';

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'block-success':
        reportSheetTitle = 'User blocked';
        reportSheetMessage =
          `${reportSheet.displayName} has been blocked.`;

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'block-error':
        reportSheetTitle =
          'Unable to block user';
        reportSheetMessage =
          'Please try again.';

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'unblock-success':
        reportSheetTitle = 'User unblocked';
        reportSheetMessage =
          `${reportSheet.displayName} has been unblocked.`;

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'unblock-error':
        reportSheetTitle =
          'Unable to unblock user';
        reportSheetMessage =
          'Please try again.';

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
    }
  }

  function toggleAuthorFollow(
    authorId: string
  ) {
    if (
      authorId === profile.id ||
      isLoadingFollowState
    ) {
      return;
    }

    toggleFollow(authorId);
  }

  async function refreshFeed() {
    if (!isAuthenticated || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const nextPosts =
        await getPublishedPosts({
          hydrateMissingArtwork: false,
        });

      const authorIds = Array.from(
        new Set(
          nextPosts
            .map((post) => post.authorId)
            .filter(
              (authorId) =>
                authorId !== profile.id
            )
        )
      );

      const authors =
        await getProfilesByIds(
          authorIds
        );

      const nextFeedAuthors =
        authors.reduce<
          Record<string, UserProfile>
        >((authorMap, author) => {
          authorMap[author.id] = author;

          return authorMap;
        }, {});

      setFeedPosts(nextPosts);
      setFeedAuthors(nextFeedAuthors);

      hydrateFeedArtworkInBackground(
        nextPosts
      );
    } catch (error) {
      if (__DEV__) {
        console.log(
          'Failed to refresh feed posts:',
          error
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  function renderFeedItem({
    item,
  }: {
    item: (typeof personalizedFeed)[number];
  }) {
    const {
      post,
      isSuggested,
      suggestionReason,
      sharedItemTitles,
    } = item;

    const author =
      getPostAuthor(
        post.authorId
      );

    if (!author) {
      return null;
    }

    const isCurrentUserPost =
      post.authorId ===
      profile.id;

    const authorIsFollowed =
      isFollowing(
        post.authorId
      );

    return (
      <View style={styles.feedItem}>
        <Top3Card
          post={post}
          author={author}
          showAuthor
          recommendationTitle={
            isSuggested
              ? 'Recommended for you'
              : undefined
          }
          recommendationReason={
            isSuggested
              ? formatSuggestionReason(
                  suggestionReason
                )
              : undefined
          }
          tasteMatchItemTitles={
            sharedItemTitles
          }
          showFollowButton={
            isSuggested &&
            !isCurrentUserPost
          }
          isFollowingAuthor={
            authorIsFollowed
          }
          isFollowLoading={
            isLoadingFollowState
          }
          onFollowPress={
            isSuggested &&
            !isCurrentUserPost
              ? () =>
                  toggleAuthorFollow(
                    post.authorId
                  )
              : undefined
          }
          onAuthorPress={() =>
            openAuthorProfile(
              post.authorId
            )
          }
          onTitlePress={() =>
            openCollectionFeed(
              post
            )
          }
          onPress={() =>
            openPost(post)
          }
          onEditPress={
            isCurrentUserPost
              ? () =>
                  editCollection(
                    post
                  )
              : undefined
          }
          onMorePress={
            !isCurrentUserPost
              ? () =>
                  openPostActions(
                    post
                  )
              : undefined
          }
          onCommentsPress={() =>
            openComments(post)
          }
          onSharePress={() => {
            void shareCollection(post);
          }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={[
        'top',
        'left',
        'right',
      ]}>
      <ScreenHeader />

      {isLoadingFeed ? (
        <View style={styles.loadingState}>
          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.loadingText}>
            Loading feed…
          </AppText>
        </View>
      ) : personalizedFeed.length === 0 ? (
        <View style={styles.content}>
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <AppText
              variant="stateTitle"
              style={styles.emptyTitle}>
              Nothing published
            </AppText>

            <AppText
              variant="bodyLarge"
              tone="tertiary"
              style={styles.emptyText}>
              Publish a Top 3 to see it here.
            </AppText>

            <PrimaryButton
              title="Create a Top 3"
              onPress={openCreateScreen}
              style={styles.emptyAction}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={personalizedFeed}
          keyExtractor={({ post }) =>
            post.id
          }
          renderItem={renderFeedItem}
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshFeed}
              tintColor={colors.secondaryText}
              colors={[colors.secondaryText]}
            />
          }
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={50}
          windowSize={5}
        />
      )}

      <ActionSheet
        visible={reportSheet !== null}
        title={reportSheetTitle}
        message={reportSheetMessage}
        actions={reportSheetActions}
        onClose={closeReportSheet}
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
    paddingTop: 20,
    paddingBottom: 32,
  },

  feedItem: {
    marginBottom: 16,
  },

  loadingState: {
    alignItems: 'center',
    paddingTop: 80,
  },

  loadingText: {},

  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },

  emptyTitle: {
    marginBottom: 8,
  },

  emptyText: {
    textAlign: 'center',
  },

  emptyAction: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
});