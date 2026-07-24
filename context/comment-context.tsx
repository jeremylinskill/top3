import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

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

type CommentContextValue = {
  comments: Comment[];
  isLoading: boolean;
  getCommentsForPost: (
    postId: string
  ) => Comment[];
  getCommentCount: (
    postId: string,
    baseCount?: number
  ) => number;
  addComment: (
    input: AddCommentInput
  ) => Comment | null;
  deleteComment: (commentId: string) => void;
};

type CommentProviderProps = {
  children: ReactNode;
};

const STORAGE_KEY = 'top3-comments';

const CommentContext =
  createContext<CommentContextValue | undefined>(
    undefined
  );

function createCommentId() {
  return `comment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function isValidComment(
  value: unknown
): value is Comment {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return false;
  }

  const comment = value as Partial<Comment>;

  return (
    typeof comment.id === 'string' &&
    typeof comment.postId === 'string' &&
    typeof comment.authorId === 'string' &&
    typeof comment.authorDisplayName ===
      'string' &&
    typeof comment.authorUsername ===
      'string' &&
    typeof comment.text === 'string' &&
    typeof comment.createdAt === 'string' &&
    (comment.authorAvatarUrl === undefined ||
      typeof comment.authorAvatarUrl ===
        'string')
  );
}

export function CommentProvider({
  children,
}: CommentProviderProps) {
  const [comments, setComments] = useState<
    Comment[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadComments() {
      try {
        const savedValue =
          await AsyncStorage.getItem(STORAGE_KEY);

        if (!savedValue) {
          return;
        }

        const parsedValue: unknown =
          JSON.parse(savedValue);

        if (
          Array.isArray(parsedValue) &&
          parsedValue.every(isValidComment) &&
          isMounted
        ) {
          setComments(parsedValue);
        }
      } catch (error) {
        console.error(
          'Failed to load comments:',
          error
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadComments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    async function saveComments() {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(comments)
        );
      } catch (error) {
        console.error(
          'Failed to save comments:',
          error
        );
      }
    }

    saveComments();
  }, [comments, isLoading]);

  const getCommentsForPost = useCallback(
    (postId: string) =>
      comments
        .filter(
          (comment) =>
            comment.postId === postId
        )
        .sort(
          (first, second) =>
            new Date(
              first.createdAt
            ).getTime() -
            new Date(
              second.createdAt
            ).getTime()
        ),
    [comments]
  );

  const getCommentCount = useCallback(
    (
      postId: string,
      baseCount = 0
    ) => {
      const localCommentCount =
        comments.filter(
          (comment) =>
            comment.postId === postId
        ).length;

      return (
        Math.max(0, baseCount) +
        localCommentCount
      );
    },
    [comments]
  );

  const addComment = useCallback(
    (
      input: AddCommentInput
    ): Comment | null => {
      const trimmedText =
        input.text.trim();

      if (
        !input.postId ||
        !input.authorId ||
        !trimmedText
      ) {
        return null;
      }

      const newComment: Comment = {
        id: createCommentId(),
        postId: input.postId,
        authorId: input.authorId,
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

      setComments((currentComments) => [
        ...currentComments,
        newComment,
      ]);

      return newComment;
    },
    []
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      setComments((currentComments) =>
        currentComments.filter(
          (comment) =>
            comment.id !== commentId
        )
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      comments,
      isLoading,
      getCommentsForPost,
      getCommentCount,
      addComment,
      deleteComment,
    }),
    [
      comments,
      isLoading,
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