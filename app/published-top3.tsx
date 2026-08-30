import ActionSheet, {
  ActionSheetAction,
} from '@/components/action-sheet';
import CommentsSheet from '@/components/comments-sheet';
import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import UserAvatar from '@/components/user-avatar';
import { TYPOGRAPHY } from '@/constants/typography';
import { useProfile } from '@/context/profile-context';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { sharePublishedCollection } from '@/lib/share';
import { getProfileById } from '@/lib/supabase/profiles';
import {
  createPostReport,
  ReportReason,
} from '@/lib/supabase/reports';
import { getPublishedPosts } from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function normalizeTopic(topic?: string) {
  return topic?.trim().toLowerCase() || 'general';
}

type ReportTop3Sheet =
  | { type: 'actions' }
  | { type: 'reasons' }
  | {
      type: 'confirm';
      reason: ReportReason;
      reasonLabel: string;
    }
  | { type: 'report-success' }
  | { type: 'report-error' }
  | null;

export default function PublishedTop3Screen() {
  const params = useLocalSearchParams<{
    postId?: string | string[];
  }>();

  const postId = Array.isArray(params.postId)
    ? params.postId[0]
    : params.postId;

  const { profile } = useProfile();

  const trackedCollectionViewPostIdRef =
    useRef<string | null>(null);


  const [post, setPost] = useState<Post | null>(
    null
  );

  const [author, setAuthor] =
    useState<UserProfile | null>(null);

  const [isLoadingPost, setIsLoadingPost] =
    useState(true);

  const [isCommentsVisible, setIsCommentsVisible] =
    useState(false);

  const [
    reportSheet,
    setReportSheet,
  ] = useState<ReportTop3Sheet>(null);

  useEffect(() => {
    trackedCollectionViewPostIdRef.current =
      null;
  }, [postId]);

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      if (!postId) {
        if (isMounted) {
          setPost(null);
          setIsLoadingPost(false);
        }

        return;
      }

      setIsLoadingPost(true);

      try {
        const publishedPosts =
          await getPublishedPosts();

        const matchingPost =
          publishedPosts.find(
            (item) => item.id === postId
          ) ?? null;

        let matchingAuthor: UserProfile | null = null;

        if (matchingPost) {
          matchingAuthor =
            matchingPost.authorId === profile.id
              ? profile
              : await getProfileById(
                  matchingPost.authorId
                );
        }

        if (isMounted) {
          setPost(matchingPost);
          setAuthor(matchingAuthor);

          if (
            matchingPost &&
            trackedCollectionViewPostIdRef.current !==
              matchingPost.id
          ) {
            trackedCollectionViewPostIdRef.current =
              matchingPost.id;

            trackAnalyticsEvent(
              'collection_viewed'
            );
          }
        }
      } catch (error) {
        console.error(
          'Failed to load published Top 3:',
          error
        );

        if (isMounted) {
          setPost(null);
          setAuthor(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPost(false);
        }
      }
    }

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [postId, profile]);


  if (isLoadingPost) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader showBackButton />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color="#222222"
          />

          <Text style={styles.loadingText}>
            Loading Top 3…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Top 3 Not Found"
          showBackButton
        />

        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>
            This Top 3 is unavailable
          </Text>

          <Text style={styles.messageText}>
            It may have been removed or is no
            longer available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPost = post;

  const authorId = post.authorId;

  const isCurrentUserPost =
    authorId === profile.id;

  function openAuthorProfile() {
    if (isCurrentUserPost) {
      router.push('/(tabs)/profile');
      return;
    }

    router.push({
      pathname: '/public-profile',
      params: {
        userId: authorId,
      },
    });
  }

  function openCollectionFeed() {
    router.push({
      pathname: '/category-feed',
      params: {
        category: currentPost.collection.category,
        topic: normalizeTopic(
          currentPost.collection.topic
        ),
      },
    });
  }

  async function shareCollection() {
    await sharePublishedCollection({
      postId: currentPost.id,
      title: currentPost.collection.title,
      source: 'published_detail',
    });
  }

  function editCollection() {
    if (!isCurrentUserPost) {
      return;
    }

    router.push({
      pathname: '/collection',
      params: {
        listId: currentPost.collection.id,
      },
    });
  }

  function closeReportSheet() {
    setReportSheet(null);
  }

  function openPostActions() {
    if (isCurrentUserPost) {
      return;
    }

    setReportSheet({
      type: 'actions',
    });
  }

  function openReportReasons() {
    if (isCurrentUserPost) {
      return;
    }

    setReportSheet({
      type: 'reasons',
    });
  }

  function confirmPostReport(
    reason: ReportReason,
    reasonLabel: string
  ) {
    if (isCurrentUserPost) {
      return;
    }

    setReportSheet({
      type: 'confirm',
      reason,
      reasonLabel,
    });
  }

  async function handleReportPost(
    reason: ReportReason
  ) {
    if (isCurrentUserPost) {
      return;
    }

    try {
      await createPostReport({
        reporterId: profile.id,
        reportedUserId: authorId,
        reportedPostId: currentPost.id,
        reason,
      });

      setReportSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report Top 3:',
        error
      );

      setReportSheet({
        type: 'report-error',
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
      case 'actions':
        reportSheetTitle =
          undefined;

        reportSheetActions = [
          {
            label: 'Report List',
            onPress: openReportReasons,
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'reasons':
        if (isCurrentUserPost) {
          closeReportSheet();
          break;
        }
        reportSheetTitle =
          'Report List';
        reportSheetMessage =
          'Why are you reporting this list?';

        reportSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmPostReport(
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmPostReport(
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmPostReport(
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmPostReport(
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmPostReport(
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmPostReport(
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

      case 'confirm':
        if (isCurrentUserPost) {
          closeReportSheet();
          break;
        }
        reportSheetTitle =
          'Report this list?';
        reportSheetMessage =
          `Reason: ${reportSheet.reasonLabel}`;

        reportSheetActions = [
          {
            label: 'Submit Report',
            variant: 'destructive',
            onPress: () => {
              const reason =
                reportSheet.reason;

              closeReportSheet();
              void handleReportPost(reason);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

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

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <View style={styles.keyboardView}>
        <ScreenHeader
          showBackButton
          rightIconName={
            isCurrentUserPost
              ? 'share-outline'
              : 'ellipsis-horizontal'
          }
          onRightPress={
            isCurrentUserPost
              ? () => {
                  void shareCollection();
                }
              : openPostActions
          }
          rightAccessibilityLabel={
            isCurrentUserPost
              ? 'Share Top 3'
              : 'Open Top 3 actions'
          }
          secondaryRightIconName={
            isCurrentUserPost
              ? undefined
              : 'share-outline'
          }
          onSecondaryRightPress={
            isCurrentUserPost
              ? undefined
              : () => {
                  void shareCollection();
                }
          }
          secondaryRightAccessibilityLabel="Share Top 3"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {author ? (
            <Pressable
              style={({ pressed }) => [
                styles.authorRow,
                pressed && styles.pressed,
              ]}
              onPress={openAuthorProfile}
              accessibilityRole="button"
              accessibilityLabel={`Open ${author.displayName}'s profile`}>
              <UserAvatar
                displayName={author.displayName}
                avatarUrl={author.avatarUrl}
                size={48}
                fontSize={20}
              />

              <View
                style={styles.authorDetails}>
                <Text style={styles.authorName}>
                  {author.displayName}
                </Text>

                <Text style={styles.username}>
                  @{author.username}
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>
          ) : null}

          <Top3Card
            post={post}
            author={author}
            showAuthor={false}
            onTitlePress={
              openCollectionFeed
            }
            onEditPress={
              isCurrentUserPost
                ? editCollection
                : undefined
            }
            onCommentsPress={() =>
              setIsCommentsVisible(true)
            }
          />

        </ScrollView>

      </View>

      <CommentsSheet
        visible={isCommentsVisible}
        post={currentPost}
        onClose={() =>
          setIsCommentsVisible(false)
        }
      />

      <ActionSheet
        visible={reportSheet !== null}
        title={reportSheetTitle}
        message={reportSheetMessage}
        actions={reportSheetActions}
        onClose={closeReportSheet}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  keyboardView: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  authorDetails: {
    flex: 1,
    marginLeft: 12,
  },

  authorName: {
    ...TYPOGRAPHY.headline,
  },

  username: {
    ...TYPOGRAPHY.subtitle,
    marginTop: 2,
    color: '#777777',
  },

  arrow: {
    fontSize: 30,
    color: '#999999',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
  },

  loadingText: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 10,
    color: '#777777',
  },

  messageContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  messageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  messageText: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 8,
    color: '#777777',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.65,
  },
});