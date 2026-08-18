import ActionSheet, {
  ActionSheetAction,
} from '@/components/action-sheet';
import { AVATAR } from '@/constants/avatar';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';

import {
  Comment,
  useComments,
} from '@/context/comment-context';
import { useProfile } from '@/context/profile-context';
import {
  createCommentReport,
  ReportReason,
} from '@/lib/supabase/reports';
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
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {
  KeyboardAvoidingView,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CommentActionSheet =
  | {
      type: 'actions';
      comment: Comment;
    }
  | {
      type: 'report-reasons';
      comment: Comment;
    }
  | {
      type: 'confirm-report';
      comment: Comment;
      reason: ReportReason;
      reasonLabel: string;
    }
  | {
      type: 'confirm-delete';
      comment: Comment;
    }
  | {
      type: 'report-success';
    }
  | {
      type: 'report-error';
    }
  | null;

type CommentsSheetProps = {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
};

const CLOSED_TRANSLATE_Y = 800;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 1.2;

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
    loadCommentsForCollection,
    clearCommentsForCollection,
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

  const [
    commentActionSheet,
    setCommentActionSheet,
  ] = useState<CommentActionSheet>(null);

  const translateY = useRef(
    new Animated.Value(CLOSED_TRANSLATE_Y)
  ).current;

  const collectionId =
    post?.collection.id ?? null;

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
  }, [
    isRendered,
    visible,
    translateY,
  ]);

  useEffect(() => {
    if (!visible || !collectionId) {
      return;
    }

    void loadCommentsForCollection(
      collectionId
    );

    return () => {
      clearCommentsForCollection();
    };
  }, [
    visible,
    collectionId,
    loadCommentsForCollection,
    clearCommentsForCollection,
  ]);

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
    if (!collectionId) {
      return [];
    }

    return getCommentsForPost(
      collectionId
    );
  }, [
    collectionId,
    getCommentsForPost,
  ]);

  const trimmedComment =
    commentText.trim();

  const canPost =
    Boolean(collectionId) &&
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

  const dismissGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(
          !isClosing &&
          keyboardHeight === 0
        )
        .activeOffsetY(8)
        .failOffsetX([-24, 24])
        .runOnJS(true)
        .onBegin(() => {
          translateY.stopAnimation();
        })
        .onUpdate((event) => {
          translateY.setValue(
            Math.max(0, event.translationY)
          );
        })
        .onEnd((event) => {
          const shouldDismiss =
            event.translationY >=
              DISMISS_DISTANCE ||
            event.velocityY >=
              DISMISS_VELOCITY * 1000;

          if (shouldDismiss) {
            handleClose();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 25,
            stiffness: 230,
            mass: 0.9,
          }).start();
        })
        .onFinalize((_event, success) => {
          if (success || isClosing) {
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 25,
            stiffness: 230,
            mass: 0.9,
          }).start();
        }),
    [
      isClosing,
      keyboardHeight,
      translateY,
    ]
  );

  function handlePostComment() {
    if (
      !collectionId ||
      !canPost
    ) {
      return;
    }

    const newComment = addComment({
      postId: collectionId,
      authorId: profile.id,
      authorDisplayName:
        profile.displayName,
      authorUsername:
        profile.username,
      authorAvatarUrl:
        profile.avatarUrl,
      text: trimmedComment,
    });

    if (newComment) {
      setCommentText('');
      Keyboard.dismiss();
    }
  }

  function closeCommentActionSheet() {
    setCommentActionSheet(null);
  }

  function openCommentActions(
    comment: Comment
  ) {
    setCommentActionSheet({
      type: 'actions',
      comment,
    });
  }

  function confirmDeleteComment(
    comment: Comment
  ) {
    if (
      comment.authorId !== profile.id
    ) {
      return;
    }

    setCommentActionSheet({
      type: 'confirm-delete',
      comment,
    });
  }

  function openReportCommentReasons(
    comment: Comment
  ) {
    if (
      comment.authorId === profile.id
    ) {
      return;
    }

    setCommentActionSheet({
      type: 'report-reasons',
      comment,
    });
  }

  function confirmReportComment(
    comment: Comment,
    reason: ReportReason,
    reasonLabel: string
  ) {
    if (
      comment.authorId === profile.id
    ) {
      return;
    }

    setCommentActionSheet({
      type: 'confirm-report',
      comment,
      reason,
      reasonLabel,
    });
  }

  async function handleReportComment(
    comment: Comment,
    reason: ReportReason
  ) {
    if (
      comment.authorId === profile.id
    ) {
      return;
    }

    try {
      await createCommentReport({
        reporterId: profile.id,
        reportedUserId: comment.authorId,
        reportedCommentId: comment.id,
        reason,
      });

      setCommentActionSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report comment:',
        error
      );

      setCommentActionSheet({
        type: 'report-error',
      });
    }
  }

  let commentActionSheetTitle:
    | string
    | undefined;
  let commentActionSheetMessage:
    | string
    | undefined;
  let commentActionSheetActions:
    ActionSheetAction[] = [];

  if (commentActionSheet) {
    switch (commentActionSheet.type) {
      case 'actions':
        commentActionSheetTitle =
          undefined;

        commentActionSheetActions =
          commentActionSheet.comment.authorId ===
          profile.id
            ? [
                {
                  label: 'Delete Comment',
                  variant: 'destructive',
                  onPress: () =>
                    confirmDeleteComment(
                      commentActionSheet.comment
                    ),
                },
                {
                  label: 'Cancel',
                  variant: 'cancel',
                  onPress:
                    closeCommentActionSheet,
                },
              ]
            : [
                {
                  label: 'Report Comment',
                  onPress: () =>
                    openReportCommentReasons(
                      commentActionSheet.comment
                    ),
                },
                {
                  label: 'Cancel',
                  variant: 'cancel',
                  onPress:
                    closeCommentActionSheet,
                },
              ];
        break;

      case 'report-reasons':
        commentActionSheetTitle =
          'Report Comment';
        commentActionSheetMessage =
          'Why are you reporting this comment?';

        commentActionSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmReportComment(
                commentActionSheet.comment,
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmReportComment(
                commentActionSheet.comment,
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmReportComment(
                commentActionSheet.comment,
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmReportComment(
                commentActionSheet.comment,
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmReportComment(
                commentActionSheet.comment,
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmReportComment(
                commentActionSheet.comment,
                'other',
                'Other'
              ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeCommentActionSheet,
          },
        ];
        break;

      case 'confirm-report':
        commentActionSheetTitle =
          'Report this comment?';
        commentActionSheetMessage =
          `Reason: ${commentActionSheet.reasonLabel}`;

        commentActionSheetActions = [
          {
            label: 'Submit Report',
            variant: 'destructive',
            onPress: () => {
              const {
                comment,
                reason,
              } = commentActionSheet;

              closeCommentActionSheet();
              void handleReportComment(
                comment,
                reason
              );
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeCommentActionSheet,
          },
        ];
        break;

      case 'confirm-delete':
        commentActionSheetTitle =
          'Delete comment?';
        commentActionSheetMessage =
          'This comment will be permanently removed.';

        commentActionSheetActions = [
          {
            label: 'Delete',
            variant: 'destructive',
            onPress: () => {
              const comment =
                commentActionSheet.comment;

              closeCommentActionSheet();
              deleteComment(comment.id);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeCommentActionSheet,
          },
        ];
        break;

      case 'report-success':
        commentActionSheetTitle =
          'Report submitted';
        commentActionSheetMessage =
          'Thanks for letting us know. Your report has been submitted for review.';

        commentActionSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeCommentActionSheet,
          },
        ];
        break;

      case 'report-error':
        commentActionSheetTitle =
          'Unable to submit report';
        commentActionSheetMessage =
          'Please try again.';

        commentActionSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeCommentActionSheet,
          },
        ];
        break;
    }
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
            <GestureDetector
              gesture={dismissGesture}>
              <View style={styles.dragArea}>
                <View style={styles.handle} />

                <View style={styles.header}>
              <Text style={styles.title}>
                Comments
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed &&
                    styles.pressed,
                ]}
                onPress={handleClose}
                disabled={isClosing}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close comments">
                <Ionicons
                  name="close"
                  size={22}
                  color={COLORS.text}
                />
                </Pressable>
                </View>
              </View>
            </GestureDetector>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={
                styles.commentsContent
              }
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled">
              {comments.length === 0 ? (
                <View
                  style={styles.emptyState}>
                  <Text
                    style={
                      styles.emptyStateTitle
                    }>
                    {isLoading
                      ? 'Loading comments…'
                      : 'No comments yet'}
                  </Text>

                  {!isLoading ? (
                    <Text
                      style={
                        styles.emptyStateText
                      }>
                      Be the first to share your
                      thoughts.
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View
                  style={styles.commentList}>
                  {comments.map(
                    (comment) => (
                      <CommentRow
                        key={comment.id}
                        comment={comment}
                        isOwnComment={
                          comment.authorId ===
                          profile.id
                        }
                        onMenuPress={() =>
                          openCommentActions(
                            comment
                          )
                        }
                      />
                    )
                  )}
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
                    style={
                      styles.avatarImage
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={styles.avatarText}>
                    {profile.displayName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                )}
              </View>

              <View
                style={
                  styles.inputContainer
                }>
                <TextInput
                  style={styles.input}
                  value={commentText}
                  onChangeText={
                    setCommentText
                  }
                  placeholder="Add a comment…"
                  placeholderTextColor={
                    COLORS.tertiaryText
                  }
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
                      styles
                        .postButtonDisabled,
                    pressed &&
                      canPost &&
                      styles.pressed,
                  ]}
                  onPress={
                    handlePostComment
                  }
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

        <ActionSheet
          visible={
            commentActionSheet !== null
          }
          title={commentActionSheetTitle}
          message={commentActionSheetMessage}
          actions={commentActionSheetActions}
          onClose={closeCommentActionSheet}
        />
      </View>
    </Modal>
  );
}

type CommentRowProps = {
  comment: Comment;
  isOwnComment: boolean;
  onMenuPress: () => void;
};

function CommentRow({
  comment,
  isOwnComment,
  onMenuPress,
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
            style={
              styles.commentAvatarText
            }>
            {comment.authorDisplayName
              .charAt(0)
              .toUpperCase()}
          </Text>
        )}
      </View>

      <View style={styles.commentBody}>
        <View
          style={styles.commentTopRow}>
          <View
            style={styles.commentMeta}>
            <Text
              style={styles.commentAuthor}
              numberOfLines={1}>
              {comment.authorDisplayName}
            </Text>

            <Text
              style={styles.commentTime}>
              {createdAtText}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.commentMenuButton,
              pressed &&
                styles.pressed,
            ]}
            onPress={onMenuPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              isOwnComment
                ? 'Open comment actions'
                : 'Open comment reporting actions'
            }>
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={
                COLORS.tertiaryText
              }
            />
          </Pressable>
        </View>

        <Text
          style={styles.commentUsername}>
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
    backgroundColor:
      'rgba(0, 0, 0, 0.3)',
  },

  keyboardUnderlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      COLORS.background,
  },

  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  sheet: {
    height: '66%',
    backgroundColor:
      COLORS.background,
    borderTopLeftRadius:
      RADIUS.xxxl,
    borderTopRightRadius:
      RADIUS.xxxl,
    overflow: 'hidden',
  },

  dragArea: {
    backgroundColor: COLORS.background,
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
    borderBottomColor:
      COLORS.border,
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
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  commentAvatarImage: {
    width: '100%',
    height: '100%',
  },

  commentAvatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  commentBody: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor:
      COLORS.border,
  },

  commentTopRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
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
    backgroundColor:
      COLORS.background,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor:
      COLORS.border,
  },

  avatar: {
    width: AVATAR.sm + 2,
    height: AVATAR.sm + 2,
    borderRadius:
      (AVATAR.sm + 2) / 2,
    marginRight: 10,
    marginBottom: 3,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  inputContainer: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
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