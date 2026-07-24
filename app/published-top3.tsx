import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import {
    Comment,
    useComments,
} from '@/context/comment-context';
import { useProfile } from '@/context/profile-context';
import {
    getHydratedFeedPosts,
    getMockUserById,
} from '@/services/post-service';
import { Post } from '@/types/post';
import { formatRelativeTime } from '@/utils/format-relative-time';
import {
    router,
    useLocalSearchParams,
} from 'expo-router';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PublishedTop3Screen() {
  const params = useLocalSearchParams<{
    postId?: string | string[];
  }>();

  const postId = Array.isArray(params.postId)
    ? params.postId[0]
    : params.postId;

  const { profile } = useProfile();

  const {
    addComment,
    getCommentsForPost,
    isLoading: isLoadingComments,
  } = useComments();

  const [post, setPost] = useState<Post | null>(
    null
  );

  const [isLoadingPost, setIsLoadingPost] =
    useState(true);

  const [commentText, setCommentText] =
    useState('');

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
        const posts =
          await getHydratedFeedPosts([]);

        const matchingPost =
          posts.find(
            (item) => item.id === postId
          ) ?? null;

        if (isMounted) {
          setPost(matchingPost);
        }
      } catch (error) {
        console.error(
          'Failed to load published Top 3:',
          error
        );

        if (isMounted) {
          setPost(null);
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
  }, [postId]);

  const comments = useMemo(() => {
    if (!postId) {
      return [];
    }

    return getCommentsForPost(postId);
  }, [postId, getCommentsForPost]);

  const trimmedComment = commentText.trim();

  const canPostComment =
    trimmedComment.length > 0 &&
    !isLoadingComments &&
    Boolean(postId);

  function handlePostComment() {
    if (!postId || !canPostComment) {
      return;
    }

    const newComment = addComment({
      postId,
      authorId: profile.id,
      authorDisplayName:
        profile.displayName,
      authorUsername: profile.username,
      authorAvatarUrl:
        profile.avatarUrl,
      text: trimmedComment,
    });

    if (newComment) {
      setCommentText('');
      Keyboard.dismiss();
    }
  }

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

  const authorId = post.authorId;

  const author =
    authorId === profile.id
      ? profile
      : getMockUserById(authorId);

  function openAuthorProfile() {
    if (authorId === profile.id) {
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

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        keyboardVerticalOffset={0}>
        <ScreenHeader showBackButton />

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
              <View style={styles.authorAvatar}>
                {author.avatarUrl ? (
                  <Image
                    source={{
                      uri: author.avatarUrl,
                    }}
                    style={
                      styles.authorAvatarImage
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={
                      styles.authorAvatarText
                    }>
                    {author.displayName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                )}
              </View>

              <View
                style={
                  styles.authorDetails
                }>
                <Text
                  style={styles.authorName}>
                  {author.displayName}
                </Text>

                <Text
                  style={styles.username}>
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
          />

          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>
                Comments
              </Text>
            </View>

            {isLoadingComments ? (
              <View
                style={
                  styles.commentsLoadingState
                }>
                <ActivityIndicator
                  size="small"
                  color="#777777"
                />

                <Text
                  style={
                    styles.commentsLoadingText
                  }>
                  Loading comments…
                </Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text
                  style={
                    styles.emptyCommentsTitle
                  }>
                  No comments yet
                </Text>

                <Text
                  style={
                    styles.emptyCommentsText
                  }>
                  Be the first to share your
                  thoughts.
                </Text>
              </View>
            ) : (
              <View style={styles.commentList}>
                {comments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.composerContainer}>
          <View style={styles.composerAvatar}>
            {profile.avatarUrl ? (
              <Image
                source={{
                  uri: profile.avatarUrl,
                }}
                style={styles.composerAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={
                  styles.composerAvatarText
                }>
                {profile.displayName
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment…"
              placeholderTextColor="#999999"
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={
                canPostComment
                  ? handlePostComment
                  : undefined
              }
              accessibilityLabel="Comment text"
            />

            <Pressable
              style={({ pressed }) => [
                styles.postButton,
                !canPostComment &&
                  styles.postButtonDisabled,
                pressed &&
                  canPostComment &&
                  styles.pressed,
              ]}
              onPress={handlePostComment}
              disabled={!canPostComment}
              accessibilityRole="button"
              accessibilityState={{
                disabled: !canPostComment,
              }}
              accessibilityLabel="Post comment">
              <Text
                style={[
                  styles.postButtonText,
                  !canPostComment &&
                    styles
                      .postButtonTextDisabled,
                ]}>
                Post
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type CommentRowProps = {
  comment: Comment;
};

function CommentRow({
  comment,
}: CommentRowProps) {
  const createdAtText =
    formatRelativeTime(
      comment.createdAt
    )?.replace(/^Updated\s+/i, '') ??
    'Just now';

  return (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatar}>
        {comment.authorAvatarUrl ? (
          <Image
            source={{
              uri: comment.authorAvatarUrl,
            }}
            style={styles.commentAvatarImage}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={styles.commentAvatarText}>
            {comment.authorDisplayName
              .charAt(0)
              .toUpperCase()}
          </Text>
        )}
      </View>

      <View style={styles.commentContent}>
        <View style={styles.commentMetaRow}>
          <Text style={styles.commentAuthor}>
            {comment.authorDisplayName}
          </Text>

          <Text style={styles.commentTime}>
            {createdAtText}
          </Text>
        </View>

        <Text style={styles.commentUsername}>
          @{comment.authorUsername}
        </Text>

        <Text style={styles.commentText}>
          {comment.text}
        </Text>
      </View>
    </View>
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

  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  authorAvatarImage: {
    width: '100%',
    height: '100%',
  },

  authorAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  authorDetails: {
    flex: 1,
    marginLeft: 12,
  },

  authorName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },

  username: {
    marginTop: 2,
    fontSize: 14,
    color: '#777777',
  },

  arrow: {
    fontSize: 30,
    color: '#999999',
  },

  commentsSection: {
    marginTop: 24,
  },

  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  commentsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },

  commentList: {
    gap: 16,
  },

  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  commentAvatarImage: {
    width: '100%',
    height: '100%',
  },

  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  commentContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },

  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  commentAuthor: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },

  commentTime: {
    marginLeft: 8,
    fontSize: 12,
    color: '#999999',
  },

  commentUsername: {
    marginTop: 1,
    fontSize: 13,
    color: '#888888',
  },

  commentText: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 21,
    color: '#333333',
  },

  emptyComments: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
  },

  emptyCommentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },

  emptyCommentsText: {
    marginTop: 6,
    fontSize: 15,
    color: '#777777',
    textAlign: 'center',
  },

  commentsLoadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },

  commentsLoadingText: {
    marginLeft: 9,
    fontSize: 15,
    color: '#777777',
  },

  composerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom:
      Platform.OS === 'ios' ? 22 : 20,
    backgroundColor: '#FAFAFA',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },

  composerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    marginBottom: 3,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  composerAvatarImage: {
    width: '100%',
    height: '100%',
  },

  composerAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  inputContainer: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 23,
    paddingLeft: 15,
    paddingRight: 6,
    paddingVertical: 5,
  },

  commentInput: {
    flex: 1,
    minHeight: 34,
    maxHeight: 100,
    paddingTop: 7,
    paddingBottom: 7,
    paddingRight: 8,
    fontSize: 15,
    lineHeight: 20,
    color: '#222222',
    textAlignVertical: 'top',
  },

  postButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  postButtonDisabled: {
    opacity: 0.45,
  },

  postButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },

  postButtonTextDisabled: {
    color: '#999999',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.65,
  },
});