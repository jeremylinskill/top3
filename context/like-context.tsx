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

type LikeContextValue = {
  likedPostIds: string[];
  isLoading: boolean;
  isLiked: (postId: string) => boolean;
  likePost: (postId: string) => void;
  unlikePost: (postId: string) => void;
  toggleLike: (postId: string) => void;
  getLikeCount: (
    postId: string,
    baseCount?: number
  ) => number;
};

type LikeProviderProps = {
  children: ReactNode;
};

const STORAGE_KEY = 'top3-liked-post-ids';

const LikeContext =
  createContext<LikeContextValue | undefined>(
    undefined
  );

export function LikeProvider({
  children,
}: LikeProviderProps) {
  const [likedPostIds, setLikedPostIds] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLikedPosts() {
      try {
        const savedValue =
          await AsyncStorage.getItem(STORAGE_KEY);

        if (!savedValue) {
          return;
        }

        const parsedValue: unknown =
          JSON.parse(savedValue);

        const isValidLikedPostIds =
          Array.isArray(parsedValue) &&
          parsedValue.every(
            (item) => typeof item === 'string'
          );

        if (
          isMounted &&
          isValidLikedPostIds
        ) {
          setLikedPostIds(parsedValue);
        }
      } catch (error) {
        console.error(
          'Failed to load liked posts:',
          error
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLikedPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    async function saveLikedPosts() {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(likedPostIds)
        );
      } catch (error) {
        console.error(
          'Failed to save liked posts:',
          error
        );
      }
    }

    saveLikedPosts();
  }, [likedPostIds, isLoading]);

  const isLiked = useCallback(
    (postId: string) =>
      likedPostIds.includes(postId),
    [likedPostIds]
  );

  const likePost = useCallback(
    (postId: string) => {
      if (!postId) {
        return;
      }

      setLikedPostIds((currentIds) => {
        if (currentIds.includes(postId)) {
          return currentIds;
        }

        return [...currentIds, postId];
      });
    },
    []
  );

  const unlikePost = useCallback(
    (postId: string) => {
      if (!postId) {
        return;
      }

      setLikedPostIds((currentIds) =>
        currentIds.filter(
          (currentId) => currentId !== postId
        )
      );
    },
    []
  );

  const toggleLike = useCallback(
    (postId: string) => {
      if (!postId) {
        return;
      }

      setLikedPostIds((currentIds) => {
        if (currentIds.includes(postId)) {
          return currentIds.filter(
            (currentId) =>
              currentId !== postId
          );
        }

        return [...currentIds, postId];
      });
    },
    []
  );

  const getLikeCount = useCallback(
    (
      postId: string,
      baseCount = 0
    ) => {
      const safeBaseCount = Math.max(
        0,
        baseCount
      );

      return isLiked(postId)
        ? safeBaseCount + 1
        : safeBaseCount;
    },
    [isLiked]
  );

  const value = useMemo(
    () => ({
      likedPostIds,
      isLoading,
      isLiked,
      likePost,
      unlikePost,
      toggleLike,
      getLikeCount,
    }),
    [
      likedPostIds,
      isLoading,
      isLiked,
      likePost,
      unlikePost,
      toggleLike,
      getLikeCount,
    ]
  );

  return (
    <LikeContext.Provider value={value}>
      {children}
    </LikeContext.Provider>
  );
}

export function useLike() {
  const context = useContext(LikeContext);

  if (!context) {
    throw new Error(
      'useLike must be used inside a LikeProvider'
    );
  }

  return context;
}