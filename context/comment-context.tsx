import { useBlock } from '@/context/block-context';
import { useAuth } from '@/hooks/use-auth';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  CommentRecord,
  createComment,
  deleteComment as deleteSupabaseComment,
  getCommentCounts as getSupabaseCommentCounts,
  getCommentsForCollection as getSupabaseCommentsForCollection,
} from '@/lib/supabase/comments';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: string;
};

type AddCommentInput = {
  postId: string;
  authorId: string;
  authorDisplayName: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  text: string;
};

type CommentCounts = Record<string, number>;

type CommentContextValue = {
  comments: Comment[];
  commentCounts: CommentCounts;
  activeCollectionId: string | null;
  isLoading: boolean;
  isLoadingCommentCounts: boolean;
  loadCommentsForCollection: (
    collectionId: string
  ) => Promise<void>;
  clearCommentsForCollection: () => void;
  loadCommentCounts: (
    collectionIds: string[]
  ) => Promise<void>;
  getCommentsForPost: (
    collectionId: string
  ) => Comment[];
  getCommentCount: (
    collectionId: string,
    baseCount?: number
  ) => number;
  addComment: (
    input: AddCommentInput
  ) => Promise<Comment | null>;
  deleteComment: (
    commentId: string
  ) => void;
};

type CommentProviderProps = {
  children: ReactNode;
};

const CommentContext =
  createContext<CommentContextValue | undefined>(
    undefined
  );

function createOptimisticCommentId() {
  return `optimistic-comment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function mapCommentRecord(
  comment: CommentRecord
): Comment {
  return {
    id: comment.id,
    postId: comment.collectionId,
    authorId: comment.userId,
    authorDisplayName:
      comment.authorDisplayName,
    authorUsername:
      comment.authorUsername,
    authorAvatarUrl:
      comment.authorAvatarUrl,
    text: comment.content,
    createdAt: comment.createdAt,
  };
}

function sortComments(
  comments: Comment[]
): Comment[] {
  return [...comments].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() -
      new Date(second.createdAt).getTime()
  );
}

function normalizeCollectionIds(
  collectionIds: string[]
): string[] {
  return Array.from(
    new Set(
      collectionIds.filter(
        (collectionId) =>
          collectionId.length > 0
      )
    )
  );
}

export function CommentProvider({
  children,
}: CommentProviderProps) {
  const { user } = useAuth();
  const { blockedUserIds } = useBlock();

  const [comments, setComments] = useState<
    Comment[]
  >([]);

  const [commentCounts, setCommentCounts] =
    useState<CommentCounts>({});

  const [
    activeCollectionId,
    setActiveCollectionId,
  ] = useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [
    isLoadingCommentCounts,
    setIsLoadingCommentCounts,
  ] = useState(false);

  const commentsRequestIdRef = useRef(0);
  const countsRequestIdRef = useRef(0);
  const activeCollectionIdRef =
    useRef<string | null>(null);
  const trackedCollectionIdsRef =
    useRef<string[]>([]);

  const clearCommentsForCollection =
    useCallback(() => {
      commentsRequestIdRef.current += 1;

      setComments([]);
      setActiveCollectionId(null);
      setIsLoading(false);
    }, []);

  useEffect(() => {
    commentsRequestIdRef.current += 1;
    countsRequestIdRef.current += 1;

    setComments([]);
    setCommentCounts({});
    setActiveCollectionId(null);
    setIsLoading(false);
    setIsLoadingCommentCounts(false);
  }, [user?.id]);

  useEffect(() => {
    activeCollectionIdRef.current =
      activeCollectionId;
  }, [activeCollectionId]);

  useEffect(() => {
    trackedCollectionIdsRef.current =
      Object.keys(commentCounts);
  }, [commentCounts]);

  const getVisibleComments =
    useCallback(
      (sourceComments: Comment[]) =>
        sourceComments.filter(
          (comment) =>
            !blockedUserIds.includes(
              comment.authorId
            )
        ),
      [blockedUserIds]
    );

  const loadCommentsForCollection =
    useCallback(
      async (collectionId: string) => {
        if (!user?.id || !collectionId) {
          clearCommentsForCollection();
          return;
        }

        const requestId =
          commentsRequestIdRef.current + 1;

        commentsRequestIdRef.current =
          requestId;

        setActiveCollectionId(collectionId);
        setComments([]);
        setIsLoading(true);

        try {
          const commentRecords =
            await getSupabaseCommentsForCollection(
              collectionId
            );

          if (
            commentsRequestIdRef.current !==
            requestId
          ) {
            return;
          }

          const mappedComments =
            sortComments(
              commentRecords.map(
                mapCommentRecord
              )
            );

          const visibleComments =
            getVisibleComments(
              mappedComments
            );

          setComments(mappedComments);

          setCommentCounts(
            (currentCounts) => ({
              ...currentCounts,
              [collectionId]:
                visibleComments.length,
            })
          );
        } catch (error) {
          if (
            commentsRequestIdRef.current !==
            requestId
          ) {
            return;
          }

          console.error(
            'Failed to load comments:',
            error
          );

          setComments([]);
        } finally {
          if (
            commentsRequestIdRef.current ===
            requestId
          ) {
            setIsLoading(false);
          }
        }
      },
      [
        user?.id,
        clearCommentsForCollection,
        getVisibleComments,
      ]
    );

  const loadCommentCounts = useCallback(
    async (collectionIds: string[]) => {
      if (!user?.id) {
        setCommentCounts({});
        setIsLoadingCommentCounts(false);
        return;
      }

      const normalizedCollectionIds =
        normalizeCollectionIds(
          collectionIds
        );

      if (
        normalizedCollectionIds.length === 0
      ) {
        setIsLoadingCommentCounts(false);
        return;
      }

      const requestId =
        countsRequestIdRef.current + 1;

      countsRequestIdRef.current =
        requestId;

      setIsLoadingCommentCounts(true);

      try {
        const loadedCounts =
          await getSupabaseCommentCounts(
            normalizedCollectionIds
          );

        if (
          countsRequestIdRef.current !==
          requestId
        ) {
          return;
        }

        const normalizedCounts =
          normalizedCollectionIds.reduce<
            CommentCounts
          >((counts, collectionId) => {
            counts[collectionId] =
              loadedCounts[collectionId] ??
              0;

            return counts;
          }, {});

        setCommentCounts(
          (currentCounts) => ({
            ...currentCounts,
            ...normalizedCounts,
          })
        );
      } catch (error) {
        if (
          countsRequestIdRef.current !==
          requestId
        ) {
          return;
        }

        console.error(
          'Failed to load comment counts:',
          error
        );
      } finally {
        if (
          countsRequestIdRef.current ===
          requestId
        ) {
          setIsLoadingCommentCounts(false);
        }
      }
    },
    [user?.id]
  );

  const refreshCommentsFromRealtime =
    useCallback(async () => {
      const collectionId =
        activeCollectionIdRef.current;

      if (!user?.id || !collectionId) {
        return;
      }

      try {
        const commentRecords =
          await getSupabaseCommentsForCollection(
            collectionId
          );

        if (
          activeCollectionIdRef.current !==
          collectionId
        ) {
          return;
        }

        const mappedComments = sortComments(
          commentRecords.map(mapCommentRecord)
        );

        const visibleComments =
          getVisibleComments(
            mappedComments
          );

        setComments(mappedComments);
        setCommentCounts(
          (currentCounts) => ({
            ...currentCounts,
            [collectionId]:
              visibleComments.length,
          })
        );
      } catch (error) {
        console.error(
          'Failed to refresh comments from Realtime:',
          error
        );
      }
    }, [
      user?.id,
      getVisibleComments,
    ]);

  const refreshCommentCountsFromRealtime =
    useCallback(async () => {
      if (!user?.id) {
        return;
      }

      const collectionIds =
        trackedCollectionIdsRef.current;

      if (collectionIds.length === 0) {
        return;
      }

      try {
        const loadedCounts =
          await getSupabaseCommentCounts(
            collectionIds
          );

        setCommentCounts(
          (currentCounts) => ({
            ...currentCounts,
            ...loadedCounts,
          })
        );
      } catch (error) {
        console.error(
          'Failed to refresh comment counts from Realtime:',
          error
        );
      }
    }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const unsubscribe =
      subscribeToTableChanges({
        channelName: `comments-${user.id}`,
        table: 'comments',
        onChange: async () => {
          await Promise.all([
            refreshCommentsFromRealtime(),
            refreshCommentCountsFromRealtime(),
          ]);
        },
      });

    return unsubscribe;
  }, [
    user?.id,
    refreshCommentsFromRealtime,
    refreshCommentCountsFromRealtime,
  ]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const subscription =
      AppState.addEventListener(
        'change',
        (nextAppState) => {
          if (nextAppState !== 'active') {
            return;
          }

          void Promise.all([
            refreshCommentsFromRealtime(),
            refreshCommentCountsFromRealtime(),
          ]);
        }
      );

    return () => {
      subscription.remove();
    };
  }, [
    user?.id,
    refreshCommentsFromRealtime,
    refreshCommentCountsFromRealtime,
  ]);

  const getCommentsForPost = useCallback(
    (collectionId: string) => {
      if (
        activeCollectionId !== collectionId
      ) {
        return [];
      }

      return sortComments(
        getVisibleComments(comments)
      );
    },
    [
      activeCollectionId,
      comments,
      getVisibleComments,
    ]
  );

  useEffect(() => {
    if (!activeCollectionId) {
      return;
    }

    const visibleCommentCount =
      getVisibleComments(comments).length;

    setCommentCounts(
      (currentCounts) => ({
        ...currentCounts,
        [activeCollectionId]:
          visibleCommentCount,
      })
    );
  }, [
    activeCollectionId,
    comments,
    getVisibleComments,
  ]);

  const getCommentCount = useCallback(
    (
      collectionId: string,
      baseCount = 0
    ) => {
      if (
        activeCollectionId === collectionId
      ) {
        return getVisibleComments(
          comments
        ).length;
      }

      const loadedCount =
        commentCounts[collectionId];

      if (loadedCount === undefined) {
        return Math.max(0, baseCount);
      }

      return Math.max(0, loadedCount);
    },
    [
      activeCollectionId,
      commentCounts,
      comments,
      getVisibleComments,
    ]
  );

  const addComment = useCallback(
    async (
      input: AddCommentInput
    ): Promise<Comment | null> => {
      const currentUserId = user?.id;
      const trimmedText =
        input.text.trim();

      if (
        !currentUserId ||
        !input.postId ||
        !trimmedText
      ) {
        return null;
      }

      const collectionId = input.postId;

      const optimisticComment: Comment = {
        id: createOptimisticCommentId(),
        postId: collectionId,
        authorId: currentUserId,
        authorDisplayName:
          input.authorDisplayName,
        authorUsername:
          input.authorUsername,
        authorAvatarUrl:
          input.authorAvatarUrl,
        text: trimmedText,
        createdAt:
          new Date().toISOString(),
      };

      if (
        activeCollectionId === collectionId
      ) {
        setComments((currentComments) =>
          sortComments([
            ...currentComments,
            optimisticComment,
          ])
        );
      }

      setCommentCounts(
        (currentCounts) => ({
          ...currentCounts,
          [collectionId]:
            (currentCounts[collectionId] ??
              0) + 1,
        })
      );

      try {
        const createdComment =
          await createComment(
            currentUserId,
            collectionId,
            trimmedText
          );

        trackAnalyticsEvent(
          'comment_added'
        );

        const mappedComment: Comment = {
          ...mapCommentRecord(
            createdComment
          ),
          authorDisplayName:
            input.authorDisplayName,
          authorUsername:
            input.authorUsername,
          authorAvatarUrl:
            input.authorAvatarUrl,
        };

        setComments((currentComments) => {
          const optimisticCommentExists =
            currentComments.some(
              (comment) =>
                comment.id ===
                optimisticComment.id
            );

          if (
            !optimisticCommentExists
          ) {
            return currentComments;
          }

          return sortComments(
            currentComments.map(
              (comment) =>
                comment.id ===
                optimisticComment.id
                  ? mappedComment
                  : comment
            )
          );
        });

        return mappedComment;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error);

        const isBlockedContentError =
          errorMessage.includes(
            'COMMENT_BLOCKED_CONTENT'
          );

        if (!isBlockedContentError) {
          console.error(
            'Failed to create comment:',
            error
          );
        }

        setComments((currentComments) =>
          currentComments.filter(
            (comment) =>
              comment.id !==
              optimisticComment.id
          )
        );

        setCommentCounts(
          (currentCounts) => ({
            ...currentCounts,
            [collectionId]: Math.max(
              0,
              (currentCounts[
                collectionId
              ] ?? 1) - 1
            ),
          })
        );

        throw error;
      }
    },
    [
      user?.id,
      activeCollectionId,
    ]
  );


  const deleteComment = useCallback(
    (commentId: string) => {
      const commentToDelete =
        comments.find(
          (comment) =>
            comment.id === commentId
        );

      if (!commentToDelete) {
        return;
      }

      const deletedComment =
        commentToDelete;

      const collectionId =
        deletedComment.postId;

      setComments((currentComments) =>
        currentComments.filter(
          (comment) =>
            comment.id !== commentId
        )
      );

      setCommentCounts(
        (currentCounts) => ({
          ...currentCounts,
          [collectionId]: Math.max(
            0,
            (currentCounts[collectionId] ??
              comments.length) - 1
          ),
        })
      );

      if (
        commentId.startsWith(
          'optimistic-comment-'
        )
      ) {
        return;
      }

      async function removeComment() {
        try {
          await deleteSupabaseComment(
            commentId
          );
        } catch (error) {
          console.error(
            'Failed to delete comment:',
            error
          );

          setComments((currentComments) => {
            const commentAlreadyRestored =
              currentComments.some(
                (comment) =>
                  comment.id ===
                  deletedComment.id
              );

            if (
              commentAlreadyRestored
            ) {
              return currentComments;
            }

            return sortComments([
              ...currentComments,
              deletedComment,
            ]);
          });

          setCommentCounts(
            (currentCounts) => ({
              ...currentCounts,
              [collectionId]:
                (currentCounts[
                  collectionId
                ] ?? 0) + 1,
            })
          );
        }
      }

      void removeComment();
    },
    [comments]
  );

  const value = useMemo(
    () => ({
      comments,
      commentCounts,
      activeCollectionId,
      isLoading,
      isLoadingCommentCounts,
      loadCommentsForCollection,
      clearCommentsForCollection,
      loadCommentCounts,
      getCommentsForPost,
      getCommentCount,
      addComment,
      deleteComment,
    }),
    [
      comments,
      commentCounts,
      activeCollectionId,
      isLoading,
      isLoadingCommentCounts,
      loadCommentsForCollection,
      clearCommentsForCollection,
      loadCommentCounts,
      getCommentsForPost,
      getCommentCount,
      addComment,
      deleteComment,
    ]
  );

  return (
    <CommentContext.Provider value={value}>
      {children}
    </CommentContext.Provider>
  );
}

export function useComments() {
  const context = useContext(
    CommentContext
  );

  if (!context) {
    throw new Error(
      'useComments must be used inside a CommentProvider'
    );
  }

  return context;
}