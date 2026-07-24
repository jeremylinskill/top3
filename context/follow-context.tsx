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
  isLoading: boolean;
  isFollowing: (userId: string) => boolean;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  toggleFollow: (userId: string) => void;
};

type FollowProviderProps = {
  children: ReactNode;
};

const STORAGE_KEY = 'top3-followed-user-ids';

const FollowContext =
  createContext<FollowContextValue | undefined>(
    undefined
  );

export function FollowProvider({
  children,
}: FollowProviderProps) {
  const [followedUserIds, setFollowedUserIds] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadFollowedUsers() {
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
          parsedValue.every(
            (item) => typeof item === 'string'
          )
        ) {
          if (isMounted) {
            setFollowedUserIds(parsedValue);
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
          JSON.stringify(followedUserIds)
        );
      } catch (error) {
        console.error(
          'Failed to save followed users:',
          error
        );
      }
    }

    saveFollowedUsers();
  }, [followedUserIds, isLoading]);

  const isFollowing = useCallback(
    (userId: string) =>
      followedUserIds.includes(userId),
    [followedUserIds]
  );

  const followUser = useCallback(
    (userId: string) => {
      if (!userId) {
        return;
      }

      setFollowedUserIds((currentIds) => {
        if (currentIds.includes(userId)) {
          return currentIds;
        }

        return [...currentIds, userId];
      });
    },
    []
  );

  const unfollowUser = useCallback(
    (userId: string) => {
      setFollowedUserIds((currentIds) =>
        currentIds.filter(
          (currentId) => currentId !== userId
        )
      );
    },
    []
  );

  const toggleFollow = useCallback(
    (userId: string) => {
      if (!userId) {
        return;
      }

      setFollowedUserIds((currentIds) => {
        if (currentIds.includes(userId)) {
          return currentIds.filter(
            (currentId) => currentId !== userId
          );
        }

        return [...currentIds, userId];
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      followedUserIds,
      isLoading,
      isFollowing,
      followUser,
      unfollowUser,
      toggleFollow,
    }),
    [
      followedUserIds,
      isLoading,
      isFollowing,
      followUser,
      unfollowUser,
      toggleFollow,
    ]
  );

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const context = useContext(FollowContext);

  if (!context) {
    throw new Error(
      'useFollow must be used inside a FollowProvider'
    );
  }

  return context;
}