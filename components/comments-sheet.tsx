import ActionSheet, {
  ActionSheetAction,
} from '@/components/action-sheet';
import AppText from '@/components/app-text';
import IconButton from '@/components/icon-button';
import PrimaryButton from '@/components/primary-button';
import UserAvatar from '@/components/user-avatar';
import { AVATAR } from '@/constants/avatar';
import { RADIUS } from '@/constants/radius';
import { TEXT_STYLES } from '@/constants/typography';
import { useAppColors } from '@/hooks/use-app-colors';

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
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
  | {
      type: 'comment-blocked';
    }
  | {
      type: 'post-error';
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
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();

  const {
    addComment,
    deleteComment,
    getCommentsForPost,
    isCommentLiked,
    toggleCommentLike,
    loadCommentsForCollection,
    clearCommentsForCollection,
    isLoading,
    hasLoadError,
  } = useComments();

  const [commentText, setCommentText] =
    useState('');

  const [replyTarget, setReplyTarget] =
    useState<Comment | null>(null);

  const inputRef = useRef<TextInput>(null);

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
    setReplyTarget(null);
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

  function handleReplyToComment(
    comment: Comment
  ) {
    if (
      comment.id.startsWith(
        'optimistic-comment-'
      )
    ) {
      return;
    }

    setReplyTarget(comment);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function clearReplyTarget() {
    setReplyTarget(null);
  }

  async function handlePostComment() {
    if (
      !collectionId ||
      !canPost
    ) {
      return;
    }

    try {
      const newComment = await addComment({
        postId: collectionId,
        authorId: profile.id,
        authorDisplayName:
          profile.displayName,
        authorUsername:
          profile.username,
        authorAvatarUrl:
          profile.avatarUrl,
        text: trimmedComment,
        replyToCommentId:
          replyTarget?.id,
        replyToUserId:
          replyTarget?.authorId,
        replyToDisplayName:
          replyTarget?.authorDisplayName,
        replyToUsername:
          replyTarget?.authorUsername,
      });

      if (newComment) {
        setCommentText('');
        setReplyTarget(null);
        Keyboard.dismiss();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      if (
        errorMessage.includes(
          'COMMENT_BLOCKED_CONTENT'
        )
      ) {
        setCommentActionSheet({
          type: 'comment-blocked',
        });
        return;
      }

      console.error(
        'Failed to post comment:',
        error
      );

      setCommentActionSheet({
        type: 'post-error',
      });
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

      case 'comment-blocked':
        commentActionSheetTitle =
          'Comment not posted';
        commentActionSheetMessage =
          "This comment contains language that isn't allowed on Top3. Please revise it and try again.";

        commentActionSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeCommentActionSheet,
          },
        ];
        break;

      case 'post-error':
        commentActionSheetTitle =
          'Unable to post comment';
        commentActionSheetMessage =
          'Something went wrong while posting your comment. Please try again.';

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
                backgroundColor:
                  colors.background,
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
                backgroundColor:
                  colors.background,
                transform: [{ translateY }],
              },
            ]}>
            <GestureDetector
              gesture={dismissGesture}>
              <View
                style={[
                  styles.dragArea,
                  {
                    backgroundColor:
                      colors.background,
                  },
                ]}>
                <View
                  style={[
                    styles.handle,
                    {
                      backgroundColor:
                        colors.border,
                    },
                  ]}
                />

                <View
                  style={[
                    styles.header,
                    {
                      borderBottomColor:
                        colors.border,
                    },
                  ]}>
              <AppText variant="modalTitle">
                Comments
              </AppText>

              <IconButton
                style={styles.closeButton}
                onPress={handleClose}
                disabled={isClosing}
                accessibilityLabel="Close comments">
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.text}
                />
              </IconButton>
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
              {isLoading &&
              comments.length === 0 ? (
                <View
                  style={styles.emptyState}>
                  <AppText variant="emptyStateTitle">
                    Loading comments…
                  </AppText>
                </View>
              ) : hasLoadError &&
                comments.length === 0 ? (
                <View
                  style={styles.emptyState}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={34}
                    color={colors.tertiaryText}
                  />

                  <AppText variant="emptyStateTitle">
                    Couldn’t load comments
                  </AppText>

                  <AppText
                    variant="body"
                    style={styles.emptyStateText}>
                    Check your connection and try
                    again.
                  </AppText>

                  <PrimaryButton
                    title="Try Again"
                    onPress={() => {
                      if (collectionId) {
                        void loadCommentsForCollection(
                          collectionId
                        );
                      }
                    }}
                    style={styles.retryButton}
                  />
                </View>
              ) : comments.length === 0 ? (
                <View
                  style={styles.emptyState}>
                  <AppText variant="emptyStateTitle">
                    No comments yet
                  </AppText>

                  <AppText
                    variant="body"
                    style={styles.emptyStateText}>
                    Be the first to share your
                    thoughts.
                  </AppText>
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
                        isLiked={isCommentLiked(
                          comment.id
                        )}
                        onLikePress={() => {
                          void toggleCommentLike(
                            comment.id
                          );
                        }}
                        onMenuPress={() =>
                          openCommentActions(
                            comment
                          )
                        }
                        onReplyPress={() =>
                          handleReplyToComment(
                            comment
                          )
                        }
                      />
                    )
                  )}
                </View>
              )}
            </ScrollView>

            <View
              style={[
                styles.composer,
                {
                  backgroundColor:
                    colors.background,
                  borderTopColor:
                    colors.border,
                },
              ]}>
              {replyTarget ? (
                <View
                  style={
                    styles.replyComposerBar
                  }>
                  <AppText
                    variant="metadata"
                    tone="secondary"
                    style={
                      styles.replyComposerText
                    }
                    numberOfLines={1}>
                    Replying to @{replyTarget.authorUsername}
                  </AppText>

                  <Pressable
                    style={({ pressed }) => [
                      styles.replyComposerCloseButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={clearReplyTarget}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel reply">
                    <Ionicons
                      name="close"
                      size={17}
                      color={colors.secondaryText}
                    />
                  </Pressable>
                </View>
              ) : null}

              <View
                style={styles.composerInputRow}>
                <View
                  style={styles.composerAvatar}>
                  <UserAvatar
                    displayName={profile.displayName}
                    avatarUrl={profile.avatarUrl}
                    size={AVATAR.sm + 2}
                    fontSize={15}
                  />
                </View>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor:
                        colors.surface,
                      borderColor:
                        colors.border,
                    },
                  ]}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.input,
                      { color: colors.text },
                    ]}
                    value={commentText}
                    onChangeText={
                      setCommentText
                    }
                    placeholder={
                      replyTarget
                        ? `Reply to @${replyTarget.authorUsername}…`
                        : 'Add a comment…'
                    }
                    placeholderTextColor={
                      colors.tertiaryText
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
                    accessibilityLabel={
                      replyTarget
                        ? `Reply to ${replyTarget.authorDisplayName}`
                        : 'Comment text'
                    }
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
                    accessibilityLabel={
                      replyTarget
                        ? 'Post reply'
                        : 'Post comment'
                    }>
                    <AppText
                      variant="action"
                      tone={
                        canPost
                          ? 'primary'
                          : 'tertiary'
                      }
                      emphasis="strong">
                      Post
                    </AppText>
                  </Pressable>
                </View>
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
  isLiked: boolean;
  onLikePress: () => void;
  onMenuPress: () => void;
  onReplyPress: () => void;
};

function CommentRow({
  comment,
  isOwnComment,
  isLiked,
  onLikePress,
  onMenuPress,
  onReplyPress,
}: CommentRowProps) {
  const colors = useAppColors();

  const createdAtText =
    formatRelativeTime(
      comment.createdAt
    )?.replace(/^Updated\s+/i, '') ??
    'Just now';

  const canInteract =
    !comment.id.startsWith(
      'optimistic-comment-'
    );

  const replyToLabel =
    comment.replyToUsername
      ? `@${comment.replyToUsername}`
      : comment.replyToDisplayName;

  return (
    <View style={styles.commentRow}>
      <UserAvatar
        displayName={comment.authorDisplayName}
        avatarUrl={comment.authorAvatarUrl}
        size={40}
        fontSize={16}
      />

      <View
        style={[
          styles.commentContent,
          {
            borderBottomColor:
              colors.border,
          },
        ]}>
        <View style={styles.commentBody}>
          <View
            style={styles.commentTopRow}>
            <View
              style={styles.commentMeta}>
              <AppText
                variant="bodyBold"
                tone="primary"
                emphasis="strong"
                style={styles.commentAuthor}
                numberOfLines={1}>
                {comment.authorDisplayName}
              </AppText>

              <AppText
                variant="micro"
                style={styles.commentTime}>
                {createdAtText}
              </AppText>
            </View>
          </View>

          <AppText
            variant="metadata"
            style={styles.commentUsername}>
            @{comment.authorUsername}
          </AppText>

          {replyToLabel ? (
            <AppText
              variant="micro"
              tone="tertiary"
              style={styles.replyToLabel}>
              Replying to {replyToLabel}
            </AppText>
          ) : null}

          <AppText
            variant="body"
            tone="primary"
            style={styles.commentText}>
            {comment.text}
          </AppText>

          {canInteract ? (
            <Pressable
              style={({ pressed }) => [
                styles.replyButton,
                pressed && styles.pressed,
              ]}
              onPress={onReplyPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Reply to ${comment.authorDisplayName}`}>
              <AppText
                variant="micro"
                tone="secondary"
                emphasis="strong">
                Reply
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <View
          style={styles.commentActionsColumn}>
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
                colors.tertiaryText
              }
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.commentLikeButton,
              pressed &&
                canInteract &&
                styles.pressed,
              !canInteract &&
                styles.commentLikeButtonDisabled,
            ]}
            onPress={onLikePress}
            disabled={!canInteract}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityState={{
              selected: isLiked,
              disabled: !canInteract,
            }}
            accessibilityLabel={
              isLiked
                ? 'Unlike comment'
                : 'Like comment'
            }>
            <Ionicons
              name={
                isLiked
                  ? 'heart'
                  : 'heart-outline'
              }
              size={17}
              color={
                isLiked
                  ? colors.heart
                  : colors.secondaryText
              }
            />
          </Pressable>
        </View>
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
  },

  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  sheet: {
    height: '66%',
    borderTopLeftRadius:
      RADIUS.xxxl,
    borderTopRightRadius:
      RADIUS.xxxl,
    overflow: 'hidden',
  },

  dragArea: {
  },

  handle: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    marginTop: 9,
  },

  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },

  closeButton: {
    position: 'absolute',
    right: 16,
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

  commentContent: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 12,
    paddingBottom: 16,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },

  commentBody: {
    flex: 1,
    minWidth: 0,
  },

  commentTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  commentMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },

  commentAuthor: {
    flexShrink: 1,
  },

  commentTime: {
    flexShrink: 0,
    marginLeft: 8,
  },

  commentActionsColumn: {
    width: 30,
    marginLeft: 8,
    alignItems: 'center',
  },

  commentMenuButton: {
    width: 30,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },

  commentUsername: {
    marginTop: -1,
  },

  replyToLabel: {
    marginTop: 7,
  },

  commentText: {
    marginTop: 5,
  },

  replyButton: {
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
    marginTop: 4,
    paddingRight: 10,
  },

  commentLikeButton: {
    marginTop: 18,
    width: 30,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  commentLikeButtonDisabled: {
    opacity: 0.45,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
  },

  emptyStateText: {
    marginTop: 7,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },

  composer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },

  replyComposerBar: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: AVATAR.sm + 12,
    marginBottom: 4,
  },

  replyComposerText: {
    flex: 1,
    minWidth: 0,
  },

  replyComposerCloseButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  composerAvatar: {
    marginRight: 10,
    marginBottom: 3,
  },

  inputContainer: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 23,
    paddingLeft: 15,
    paddingRight: 6,
    paddingVertical: 5,
  },

  input: {
    ...TEXT_STYLES.input,
    flex: 1,
    minHeight: 34,
    maxHeight: 100,
    paddingTop: 7,
    paddingBottom: 7,
    paddingRight: 8,
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

  pressed: {
    opacity: 0.65,
  },
});