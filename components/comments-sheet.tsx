import {
    Comment,
    useComments,
} from '@/context/comment-context';
import { useProfile } from '@/context/profile-context';
import { Post } from '@/types/post';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { Ionicons } from '@expo/vector-icons';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Alert,
    Animated,
    Easing,
    Image,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    KeyboardAvoidingView,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CommentsSheetProps = {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
};

const CLOSED_TRANSLATE_Y = 800;

export default function CommentsSheet({
  visible,
  post,
  onClose,
}: CommentsSheetProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();

  const {
    addComment,
    deleteComment,
    getCommentsForPost,
    isLoading,
  } = useComments();

  const [commentText, setCommentText] =
    useState('');

  const [keyboardHeight, setKeyboardHeight] =
    useState(0);

  const [isRendered, setIsRendered] =
    useState(visible);

  const [isClosing, setIsClosing] =
    useState(false);

  const translateY = useRef(
    new Animated.Value(CLOSED_TRANSLATE_Y)
  ).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    setIsRendered(true);
    setIsClosing(false);
  }, [visible]);

  useEffect(() => {
    if (!isRendered || !visible) {
      return;
    }

    translateY.setValue(CLOSED_TRANSLATE_Y);

    const animationFrame =
      requestAnimationFrame(() => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 230,
          mass: 0.9,
        }).start();
      });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isRendered, visible, translateY]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillShow'
        : 'keyboardDidShow';

    const hideEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillHide'
        : 'keyboardDidHide';

    const showSubscription =
      Keyboard.addListener(
        showEvent,
        (event) => {
          setKeyboardHeight(
            event.endCoordinates.height
          );
        }
      );

    const hideSubscription =
      Keyboard.addListener(
        hideEvent,
        () => {
          setKeyboardHeight(0);
        }
      );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const comments = useMemo(() => {
    if (!post) {
      return [];
    }

    return getCommentsForPost(post.id);
  }, [post, getCommentsForPost]);

  const trimmedComment =
    commentText.trim();

  const canPost =
    Boolean(post) &&
    trimmedComment.length > 0 &&
    !isLoading &&
    !isClosing;

  function finishClosing() {
    setCommentText('');
    setKeyboardHeight(0);
    setIsClosing(false);
    setIsRendered(false);
    onClose();
  }

  function handleClose() {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    Keyboard.dismiss();

    Animated.timing(translateY, {
      toValue: CLOSED_TRANSLATE_Y,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        finishClosing();
      }
    });
  }

  function handlePostComment() {
    if (!post || !canPost) {
      return;
    }

    const newComment = addComment({
      postId: post.id,
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

  function confirmDeleteComment(
    comment: Comment
  ) {
    if (comment.authorId !== profile.id) {
      return;
    }

    Alert.alert(
      'Delete comment?',
      'This comment will be permanently removed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteComment(comment.id);
          },
        },
      ]
    );
  }

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={styles.modal}>
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          disabled={isClosing}
          accessibilityRole="button"
          accessibilityLabel="Close comments"
        />

        {keyboardHeight > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.keyboardUnderlay,
              {
                height:
                  keyboardHeight + 32,
              },
            ]}
          />
        ) : null}

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
          keyboardVerticalOffset={0}>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom:
                  keyboardHeight > 0
                    ? 6
                    : Math.max(
                        insets.bottom,
                        14
                      ),
                transform: [{ translateY }],
              },
            ]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>
                Comments
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleClose}
                disabled={isClosing}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close comments">
                <Ionicons
                  name="close"
                  size={22}
                  color="#222222"
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={
                styles.commentsContent
              }
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text
                    style={
                      styles.emptyStateTitle
                    }>
                    No comments yet
                  </Text>

                  <Text
                    style={
                      styles.emptyStateText
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
                      isOwnComment={
                        comment.authorId ===
                        profile.id
                      }
                      onDelete={() =>
                        confirmDeleteComment(
                          comment
                        )
                      }
                    />
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.composer}>
              <View style={styles.avatar}>
                {profile.avatarUrl ? (
                  <Image
                    source={{
                      uri: profile.avatarUrl,
                    }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {profile.displayName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment…"
                  placeholderTextColor="#999999"
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  blurOnSubmit
                  editable={!isClosing}
                  onSubmitEditing={
                    canPost
                      ? handlePostComment
                      : undefined
                  }
                  accessibilityLabel="Comment text"
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.postButton,
                    !canPost &&
                      styles.postButtonDisabled,
                    pressed &&
                      canPost &&
                      styles.pressed,
                  ]}
                  onPress={handlePostComment}
                  disabled={!canPost}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: !canPost,
                  }}
                  accessibilityLabel="Post comment">
                  <Text
                    style={[
                      styles.postButtonText,
                      !canPost &&
                        styles
                          .postButtonTextDisabled,
                    ]}>
                    Post
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type CommentRowProps = {
  comment: Comment;
  isOwnComment: boolean;
  onDelete: () => void;
};

function CommentRow({
  comment,
  isOwnComment,
  onDelete,
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
            style={
              styles.commentAvatarImage
            }
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

      <View style={styles.commentBody}>
        <View style={styles.commentTopRow}>
          <View style={styles.commentMeta}>
            <Text
              style={styles.commentAuthor}
              numberOfLines={1}>
              {comment.authorDisplayName}
            </Text>

            <Text style={styles.commentTime}>
              {createdAtText}
            </Text>
          </View>

          {isOwnComment ? (
            <Pressable
              style={({ pressed }) => [
                styles.commentMenuButton,
                pressed && styles.pressed,
              ]}
              onPress={onDelete}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Delete comment">
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color="#777777"
              />
            </Pressable>
          ) : null}
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
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  keyboardUnderlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAFAFA',
  },

  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  sheet: {
    height: '66%',
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  handle: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    marginTop: 9,
    backgroundColor: '#D0D0D0',
  },

  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },

  closeButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
  },

  commentsContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
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

  commentBody: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },

  commentTopRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  commentMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },

  commentAuthor: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },

  commentTime: {
    flexShrink: 0,
    marginLeft: 8,
    fontSize: 12,
    color: '#999999',
  },

  commentMenuButton: {
    width: 30,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    marginRight: -4,
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

  emptyState: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
  },

  emptyStateTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#222222',
  },

  emptyStateText: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 21,
    color: '#777777',
    textAlign: 'center',
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },

  avatar: {
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

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
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

  input: {
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

  pressed: {
    opacity: 0.65,
  },
});