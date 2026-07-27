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

const STORAGE_KEY =
  'top3-followed-user-ids';

const MOCK_FOLLOWER_USER_IDS = [
  'alex',
  'sarah',
];

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
  const [followedUserIds, setFollowedUserIds] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const followerUserIds = useMemo(
    () =>
      getUniqueUserIds(
        MOCK_FOLLOWER_USER_IDS
      ),
    []
  );

  useEffect(() => {
    let isMounted = true;

    async function loadFollowedUsers() {
      try {
        const savedValue =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        if (!savedValue) {
          return;
        }

        const parsedValue: unknown =
          JSON.parse(savedValue);

        if (
          Array.isArray(parsedValue) &&
          parsedValue.every(
            (item) =>
              typeof item === 'string'
          )
        ) {
          const uniqueIds =
            getUniqueUserIds(parsedValue);

          if (isMounted) {
            setFollowedUserIds(
              uniqueIds
            );
          }
        }
      } catch (error) {
        console.error(
          'Failed to load followed users:',
          error
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFollowedUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    async function saveFollowedUsers() {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            followedUserIds
          )
        );
      } catch (error) {
        console.error(
          'Failed to save followed users:',
          error
        );
      }
    }

    saveFollowedUsers();
  }, [
    followedUserIds,
    isLoading,
  ]);

  const isFollowing = useCallback(
    (userId: string) => {
      const normalizedUserId =
        normalizeUserId(userId);

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
    (userId: string) => {
      const normalizedUserId =
        normalizeUserId(userId);

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
    (userId: string) => {
      const normalizedUserId =
        normalizeUserId(userId);

      if (!normalizedUserId) {
        return;
      }

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
    },
    []
  );

  const unfollowUser = useCallback(
    (userId: string) => {
      const normalizedUserId =
        normalizeUserId(userId);

      if (!normalizedUserId) {
        return;
      }

      setFollowedUserIds(
        (currentIds) =>
          currentIds.filter(
            (currentId) =>
              currentId !==
              normalizedUserId
          )
      );
    },
    []
  );

  const toggleFollow = useCallback(
    (userId: string) => {
      const normalizedUserId =
        normalizeUserId(userId);

      if (!normalizedUserId) {
        return;
      }

      setFollowedUserIds(
        (currentIds) => {
          if (
            currentIds.includes(
              normalizedUserId
            )
          ) {
            return currentIds.filter(
              (currentId) =>
                currentId !==
                normalizedUserId
            );
          }

          return [
            ...currentIds,
            normalizedUserId,
          ];
        }
      );
    },
    []
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