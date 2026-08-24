import ActionSheet, {
  ActionSheetAction,
} from '@/components/action-sheet';
import CommentsSheet from '@/components/comments-sheet';
import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import { useBlock } from '@/context/block-context';
import { useComments } from '@/context/comment-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAuth } from '@/hooks/use-auth';
import { sharePublishedCollection } from '@/lib/share';
import { getPublicProfilesByIds } from '@/lib/supabase/profiles';
import {
  createPostReport,
  createUserReport,
  ReportReason,
} from '@/lib/supabase/reports';
import { getPublishedPosts } from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { buildPersonalizedFeed } from '@/utils/build-personalized-feed';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
  | null;

export default function FeedScreen() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();

  const { profile } = useProfile();

  const {
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

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  const [
    reportSheet,
    setReportSheet,
  ] = useState<FeedReportSheet>(null);

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

    let isMounted = true;

    async function loadFeedPosts() {
      setIsLoadingFeed(true);

      try {
        const nextPosts =
          await getPublishedPosts();

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
          await getPublicProfilesByIds(
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
        }
      } catch (error) {
        console.error(
          'Failed to load feed posts:',
          error
        );

        if (isMounted) {
          setFeedPosts(posts);
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
    posts,
    profile.id,
  ]);

  const personalizedFeed = useMemo(
  () =>
    buildPersonalizedFeed({
      posts: feedPosts,
      profilesByUserId: feedAuthors,
      currentUserId: profile.id,
      followedUserIds,
    }),
    [
      feedPosts,
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

      Alert.alert(
        'User blocked',
        `${author?.displayName ?? 'This user'} has been blocked.`
      );
    } catch (error) {
      console.error(
        'Failed to block user from feed:',
        error
      );

      Alert.alert(
        'Unable to block user',
        'Please try again.'
      );
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

      Alert.alert(
        'User unblocked',
        `${author?.displayName ?? 'This user'} has been unblocked.`
      );
    } catch (error) {
      console.error(
        'Failed to unblock user from feed:',
        error
      );

      Alert.alert(
        'Unable to unblock user',
        'Please try again.'
      );
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
        await getPublishedPosts();

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
        await getPublicProfilesByIds(
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
    } catch (error) {
      console.error(
        'Failed to refresh feed posts:',
        error
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={[
        'top',
        'left',
        'right',
      ]}>
      <ScreenHeader />

      <ScrollView
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
          />
        }>
        {isLoadingFeed ? (
          <View
            style={styles.loadingState}>
            <Text
              style={styles.loadingText}>
              Loading feed…
            </Text>
          </View>
        ) : personalizedFeed.length ===
          0 ? (
          <View
            style={styles.emptyState}>
            <Text
              style={styles.emptyTitle}>
              Nothing published yet
            </Text>

            <Text
              style={styles.emptyText}>
              Publish a completed Top 3 to
              see it here.
            </Text>
          </View>
        ) : (
          personalizedFeed.map(
            ({
              post,
              isSuggested,
              suggestionReason,
              sharedItemTitles,
            }) => {
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
                <View
                  key={post.id}
                  style={
                    styles.feedItem
                  }>
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
                      isSuggested
                        ? sharedItemTitles
                        : undefined
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
          )
        )}
      </ScrollView>

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
    backgroundColor: '#FAFAFA',
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

  loadingText: {
    fontSize: 16,
    color: '#777777',
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    marginBottom: 8,
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },

  emptyText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
    textAlign: 'center',
  },
});