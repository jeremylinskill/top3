import { useAuth } from '@/hooks/use-auth';
import {
  createFollow,
  deleteFollow,
  getFollowSnapshot,
} from '@/lib/supabase/follows';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type FollowContextValue = {
  followedUserIds: string[];
  followerUserIds: string[];
  isLoading: boolean;

  isFollowing: (userId: string) => boolean;
  isFollower: (userId: string) => boolean;

  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  toggleFollow: (userId: string) => void;

  getFollowingCount: () => number;
  getFollowerCount: () => number;

  getFollowingUserIds: () => string[];
  getFollowerUserIds: () => string[];
};

type FollowProviderProps = {
  children: ReactNode;
};

const FollowContext =
  createContext<FollowContextValue | undefined>(
    undefined
  );

function normalizeUserId(userId: string) {
  return userId.trim();
}

function getUniqueUserIds(
  userIds: string[]
) {
  return Array.from(
    new Set(
      userIds
        .map(normalizeUserId)
        .filter(Boolean)
    )
  );
}

export function FollowProvider({
  children,
}: FollowProviderProps) {
  const { user } = useAuth();

  const [followedUserIds, setFollowedUserIds] =
    useState<string[]>([]);

  const [followerUserIds, setFollowerUserIds] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const userId = user?.id;

  const refreshFollows = useCallback(
    async ({
      showLoading = false,
      clearExisting = false,
    }: {
      showLoading?: boolean;
      clearExisting?: boolean;
    } = {}) => {
      if (clearExisting) {
        setFollowedUserIds([]);
        setFollowerUserIds([]);
      }

      if (!userId) {
        setFollowedUserIds([]);
        setFollowerUserIds([]);
        setIsLoading(false);
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const snapshot =
          await getFollowSnapshot(userId);

        setFollowedUserIds(
          getUniqueUserIds(
            snapshot.followedUserIds
          )
        );

        setFollowerUserIds(
          getUniqueUserIds(
            snapshot.followerUserIds
          )
        );
      } catch (error) {
        console.error(
          'Failed to load follows:',
          error
        );
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadFollows() {
      setFollowedUserIds([]);
      setFollowerUserIds([]);
      setIsLoading(true);

      if (!userId) {
        if (!isCancelled) {
          setIsLoading(false);
        }

        return;
      }

      try {
        const snapshot =
          await getFollowSnapshot(userId);

        if (isCancelled) {
          return;
        }

        setFollowedUserIds(
          getUniqueUserIds(
            snapshot.followedUserIds
          )
        );

        setFollowerUserIds(
          getUniqueUserIds(
            snapshot.followerUserIds
          )
        );
      } catch (error) {
        console.error(
          'Failed to load follows:',
          error
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFollows();

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
        channelName: `follows-${userId}`,
        table: 'follows',
        onChange: () =>
          refreshFollows({
            showLoading: false,
          }),
      });

    return unsubscribe;
  }, [
    userId,
    refreshFollows,
  ]);

  const isFollowing = useCallback(
    (targetUserId: string) => {
      const normalizedUserId =
        normalizeUserId(targetUserId);

      if (!normalizedUserId) {
        return false;
      }

      return followedUserIds.includes(
        normalizedUserId
      );
    },
    [followedUserIds]
  );

  const isFollower = useCallback(
    (targetUserId: string) => {
      const normalizedUserId =
        normalizeUserId(targetUserId);

      if (!normalizedUserId) {
        return false;
      }

      return followerUserIds.includes(
        normalizedUserId
      );
    },
    [followerUserIds]
  );

  const followUser = useCallback(
    (targetUserId: string) => {
      const normalizedUserId =
        normalizeUserId(targetUserId);

      if (
        !userId ||
        !normalizedUserId ||
        normalizedUserId === userId ||
        followedUserIds.includes(
          normalizedUserId
        )
      ) {
        return;
      }

      const currentUserId = userId;

      setFollowedUserIds(
        (currentIds) => [
          ...currentIds,
          normalizedUserId,
        ]
      );

      async function saveFollow() {
        try {
          await createFollow(
            currentUserId,
            normalizedUserId
          );
        } catch (error) {
          console.error(
            'Failed to create follow:',
            error
          );

          setFollowedUserIds(
            (currentIds) =>
              currentIds.filter(
                (currentId) =>
                  currentId !==
                  normalizedUserId
              )
          );
        }
      }

      void saveFollow();
    },
    [
      userId,
      followedUserIds,
    ]
  );

  const unfollowUser = useCallback(
    (targetUserId: string) => {
      const normalizedUserId =
        normalizeUserId(targetUserId);

      if (
        !userId ||
        !normalizedUserId ||
        !followedUserIds.includes(
          normalizedUserId
        )
      ) {
        return;
      }

      const currentUserId = userId;

      setFollowedUserIds(
        (currentIds) =>
          currentIds.filter(
            (currentId) =>
              currentId !==
              normalizedUserId
          )
      );

      async function removeFollow() {
        try {
          await deleteFollow(
            currentUserId,
            normalizedUserId
          );
        } catch (error) {
          console.error(
            'Failed to delete follow:',
            error
          );

          setFollowedUserIds(
            (currentIds) => {
              if (
                currentIds.includes(
                  normalizedUserId
                )
              ) {
                return currentIds;
              }

              return [
                ...currentIds,
                normalizedUserId,
              ];
            }
          );
        }
      }

      void removeFollow();
    },
    [
      userId,
      followedUserIds,
    ]
  );

  const toggleFollow = useCallback(
    (targetUserId: string) => {
      if (isFollowing(targetUserId)) {
        unfollowUser(targetUserId);
        return;
      }

      followUser(targetUserId);
    },
    [
      isFollowing,
      followUser,
      unfollowUser,
    ]
  );

  const getFollowingCount =
    useCallback(
      () => followedUserIds.length,
      [followedUserIds]
    );

  const getFollowerCount =
    useCallback(
      () => followerUserIds.length,
      [followerUserIds]
    );

  const getFollowingUserIds =
    useCallback(
      () => [...followedUserIds],
      [followedUserIds]
    );

  const getFollowerUserIds =
    useCallback(
      () => [...followerUserIds],
      [followerUserIds]
    );

  const value = useMemo(
    () => ({
      followedUserIds,
      followerUserIds,
      isLoading,

      isFollowing,
      isFollower,

      followUser,
      unfollowUser,
      toggleFollow,

      getFollowingCount,
      getFollowerCount,

      getFollowingUserIds,
      getFollowerUserIds,
    }),
    [
      followedUserIds,
      followerUserIds,
      isLoading,
      isFollowing,
      isFollower,
      followUser,
      unfollowUser,
      toggleFollow,
      getFollowingCount,
      getFollowerCount,
      getFollowingUserIds,
      getFollowerUserIds,
    ]
  );

  return (
    <FollowContext.Provider
      value={value}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const context =
    useContext(FollowContext);

  if (!context) {
    throw new Error(
      'useFollow must be used inside a FollowProvider'
    );
  }

  return context;
}