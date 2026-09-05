import { useAuth } from '@/hooks/use-auth';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  createLike,
  deleteLike,
  getLikeSnapshot,
  LikeCountsByCollectionId,
} from '@/lib/supabase/likes';
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

const LikeContext =
  createContext<LikeContextValue | undefined>(
    undefined
  );

export function LikeProvider({
  children,
}: LikeProviderProps) {
  const { user } = useAuth();

  const [likedPostIds, setLikedPostIds] =
    useState<string[]>([]);

  const [likeCounts, setLikeCounts] =
    useState<LikeCountsByCollectionId>({});

  const [isLoading, setIsLoading] =
    useState(true);

  const pendingPostIdsRef =
    useRef<Set<string>>(new Set());

  const userId = user?.id;

  const refreshLikes = useCallback(
    async ({
      showLoading = false,
      clearExisting = false,
    }: {
      showLoading?: boolean;
      clearExisting?: boolean;
    } = {}) => {
      if (clearExisting) {
        setLikedPostIds([]);
        setLikeCounts({});
      }

      if (!userId) {
        setLikedPostIds([]);
        setLikeCounts({});
        setIsLoading(false);
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const snapshot =
          await getLikeSnapshot(userId);

        setLikedPostIds(
          snapshot.likedCollectionIds
        );

        setLikeCounts(snapshot.likeCounts);
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load likes:',
            error
          );
        }
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    pendingPostIdsRef.current.clear();

    let isCancelled = false;

    async function loadLikes() {
      setLikedPostIds([]);
      setLikeCounts({});
      setIsLoading(true);

      if (!userId) {
        if (!isCancelled) {
          setIsLoading(false);
        }

        return;
      }

      try {
        const snapshot =
          await getLikeSnapshot(userId);

        if (isCancelled) {
          return;
        }

        setLikedPostIds(
          snapshot.likedCollectionIds
        );

        setLikeCounts(snapshot.likeCounts);
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load likes:',
            error
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLikes();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribe =
      subscribeToTableChanges({
        channelName: `likes-${userId}`,
        table: 'likes',
        onChange: () =>
          refreshLikes({
            showLoading: false,
          }),
      });

    return unsubscribe;
  }, [userId, refreshLikes]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const subscription =
      AppState.addEventListener(
        'change',
        (nextAppState) => {
          if (nextAppState === 'active') {
            void refreshLikes({
              showLoading: false,
            });
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [userId, refreshLikes]);

  const isLiked = useCallback(
    (postId: string) =>
      likedPostIds.includes(postId),
    [likedPostIds]
  );

  const likePost = useCallback(
    (postId: string) => {
      if (
        !userId ||
        !postId ||
        likedPostIds.includes(postId) ||
        pendingPostIdsRef.current.has(postId)
      ) {
        return;
      }

      const currentUserId = userId;

      pendingPostIdsRef.current.add(postId);

      setLikedPostIds((currentIds) => {
        if (currentIds.includes(postId)) {
          return currentIds;
        }

        return [...currentIds, postId];
      });

      setLikeCounts((currentCounts) => ({
        ...currentCounts,
        [postId]:
          (currentCounts[postId] ?? 0) + 1,
      }));

      async function saveLike() {
        try {
          await createLike(
            currentUserId,
            postId
          );

          trackAnalyticsEvent(
            'collection_liked'
          );
        } catch (error) {
          console.error(
            'Failed to create like:',
            error
          );

          setLikedPostIds((currentIds) =>
            currentIds.filter(
              (currentId) =>
                currentId !== postId
            )
          );

          setLikeCounts((currentCounts) => ({
            ...currentCounts,
            [postId]: Math.max(
              0,
              (currentCounts[postId] ?? 1) - 1
            ),
          }));
        } finally {
          pendingPostIdsRef.current.delete(postId);
        }
      }

      void saveLike();
    },
    [userId, likedPostIds]
  );

  const unlikePost = useCallback(
    (postId: string) => {
      if (
        !userId ||
        !postId ||
        !likedPostIds.includes(postId) ||
        pendingPostIdsRef.current.has(postId)
      ) {
        return;
      }

      const currentUserId = userId;

      pendingPostIdsRef.current.add(postId);

      setLikedPostIds((currentIds) =>
        currentIds.filter(
          (currentId) =>
            currentId !== postId
        )
      );

      setLikeCounts((currentCounts) => ({
        ...currentCounts,
        [postId]: Math.max(
          0,
          (currentCounts[postId] ?? 1) - 1,
        ),
      }));

      async function removeLike() {
        try {
          await deleteLike(
            currentUserId,
            postId
          );
        } catch (error) {
          console.error(
            'Failed to delete like:',
            error
          );

          setLikedPostIds((currentIds) => {
            if (currentIds.includes(postId)) {
              return currentIds;
            }

            return [...currentIds, postId];
          });

          setLikeCounts((currentCounts) => ({
            ...currentCounts,
            [postId]:
              (currentCounts[postId] ?? 0) + 1,
          }));
        } finally {
          pendingPostIdsRef.current.delete(postId);
        }
      }

      void removeLike();
    },
    [userId, likedPostIds]
  );

  const toggleLike = useCallback(
    (postId: string) => {
      if (pendingPostIdsRef.current.has(postId)) {
        return;
      }

      if (isLiked(postId)) {
        unlikePost(postId);
        return;
      }

      likePost(postId);
    },
    [isLiked, likePost, unlikePost]
  );

  const getLikeCount = useCallback(
    (
      postId: string,
      baseCount = 0
    ) => {
      const databaseCount =
        likeCounts[postId];

      if (
        typeof databaseCount === 'number'
      ) {
        return databaseCount;
      }

      return Math.max(0, baseCount);
    },
    [likeCounts]
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