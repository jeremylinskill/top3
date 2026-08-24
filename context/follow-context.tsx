import { useAuth } from '@/hooks/use-auth';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  acceptFollowRequest as acceptFollowRequestInDatabase,
  cancelFollowRequest as cancelFollowRequestInDatabase,
  createFollowRequest,
  declineFollowRequest as declineFollowRequestInDatabase,
  FollowRequest,
  getFollowRequestSnapshot,
} from '@/lib/supabase/follow-requests';
import {
  createFollow,
  deleteFollow,
  getFollowSnapshot,
  removeFollower,
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
  sentFollowRequests: FollowRequest[];
  receivedFollowRequests: FollowRequest[];
  isLoading: boolean;

  isFollowing: (userId: string) => boolean;
  isFollower: (userId: string) => boolean;
  isFollowRequested: (userId: string) => boolean;

  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  toggleFollow: (userId: string) => void;

  requestFollow: (userId: string) => void;
  cancelFollowRequest: (userId: string) => void;
  acceptFollowRequest: (requestId: string) => void;
  declineFollowRequest: (requestId: string) => void;
  removeFollower: (userId: string) => void;

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

  const [
    sentFollowRequests,
    setSentFollowRequests,
  ] = useState<FollowRequest[]>([]);

  const [
    receivedFollowRequests,
    setReceivedFollowRequests,
  ] = useState<FollowRequest[]>([]);

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

  const refreshFollowRequests = useCallback(
    async ({
      clearExisting = false,
    }: {
      clearExisting?: boolean;
    } = {}) => {
      if (clearExisting) {
        setSentFollowRequests([]);
        setReceivedFollowRequests([]);
      }

      if (!userId) {
        setSentFollowRequests([]);
        setReceivedFollowRequests([]);
        return;
      }

      try {
        const snapshot =
          await getFollowRequestSnapshot(
            userId
          );

        setSentFollowRequests(
          snapshot.sentRequests
        );

        setReceivedFollowRequests(
          snapshot.receivedRequests
        );
      } catch (error) {
        console.error(
          'Failed to load follow requests:',
          error
        );
      }
    },
    [userId]
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadFollowState() {
      setFollowedUserIds([]);
      setFollowerUserIds([]);
      setSentFollowRequests([]);
      setReceivedFollowRequests([]);
      setIsLoading(true);

      if (!userId) {
        if (!isCancelled) {
          setIsLoading(false);
        }

        return;
      }

      try {
        const [
          followSnapshot,
          followRequestSnapshot,
        ] = await Promise.all([
          getFollowSnapshot(userId),
          getFollowRequestSnapshot(userId),
        ]);

        if (isCancelled) {
          return;
        }

        setFollowedUserIds(
          getUniqueUserIds(
            followSnapshot.followedUserIds
          )
        );

        setFollowerUserIds(
          getUniqueUserIds(
            followSnapshot.followerUserIds
          )
        );

        setSentFollowRequests(
          followRequestSnapshot.sentRequests
        );

        setReceivedFollowRequests(
          followRequestSnapshot.receivedRequests
        );
      } catch (error) {
        console.error(
          'Failed to load follow state:',
          error
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFollowState();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribeFromFollows =
      subscribeToTableChanges({
        channelName: `follows-${userId}`,
        table: 'follows',
        onChange: () =>
          refreshFollows({
            showLoading: false,
          }),
      });

    const unsubscribeFromFollowRequests =
      subscribeToTableChanges({
        channelName: `follow-requests-${userId}`,
        table: 'follow_requests',
        onChange: () =>
          refreshFollowRequests(),
      });

    return () => {
      unsubscribeFromFollows();
      unsubscribeFromFollowRequests();
    };
  }, [
    userId,
    refreshFollows,
    refreshFollowRequests,
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

  const isFollowRequested = useCallback(
    (targetUserId: string) => {
      const normalizedUserId =
        normalizeUserId(targetUserId);

      if (!normalizedUserId) {
        return false;
      }

      return sentFollowRequests.some(
        (request) =>
          request.recipientUserId ===
          normalizedUserId
      );
    },
    [sentFollowRequests]
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

          trackAnalyticsEvent(
            'user_followed'
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

  const requestFollow = useCallback(
    (targetUserId: string) => {
      const normalizedUserId =
        normalizeUserId(targetUserId);

      if (
        !userId ||
        !normalizedUserId ||
        normalizedUserId === userId ||
        followedUserIds.includes(
          normalizedUserId
        ) ||
        sentFollowRequests.some(
          (request) =>
            request.recipientUserId ===
            normalizedUserId
        )
      ) {
        return;
      }

      const currentUserId = userId;

      async function saveFollowRequest() {
        try {
          const request =
            await createFollowRequest(
              currentUserId,
              normalizedUserId
            );

          setSentFollowRequests(
            (currentRequests) => [
              request,
              ...currentRequests,
            ]
          );
        } catch (error) {
          console.error(
            'Failed to create follow request:',
            error
          );
        }
      }

      void saveFollowRequest();
    },
    [
      userId,
      followedUserIds,
      sentFollowRequests,
    ]
  );

  const cancelFollowRequest = useCallback(
    (targetUserId: string) => {
      const normalizedUserId =
        normalizeUserId(targetUserId);

      const request =
        sentFollowRequests.find(
          (item) =>
            item.recipientUserId ===
            normalizedUserId
        );

      if (!request) {
        return;
      }

      const followRequest = request;

      setSentFollowRequests(
        (currentRequests) =>
          currentRequests.filter(
            (item) =>
              item.id !== followRequest.id
          )
      );

      async function removeFollowRequest() {
        try {
          await cancelFollowRequestInDatabase(
            followRequest.id
          );
        } catch (error) {
          console.error(
            'Failed to cancel follow request:',
            error
          );

          setSentFollowRequests(
            (currentRequests) => {
              if (
                currentRequests.some(
                  (item) =>
                    item.id === followRequest.id
                )
              ) {
                return currentRequests;
              }

              return [
                followRequest,
                ...currentRequests,
              ];
            }
          );
        }
      }

      void removeFollowRequest();
    },
    [sentFollowRequests]
  );

  const acceptFollowRequest = useCallback(
    (requestId: string) => {
      const request =
        receivedFollowRequests.find(
          (item) =>
            item.id === requestId
        );

      if (!request) {
        return;
      }

      const followRequest = request;

      setReceivedFollowRequests(
        (currentRequests) =>
          currentRequests.filter(
            (item) =>
              item.id !== followRequest.id
          )
      );

      async function approveFollowRequest() {
        try {
          await acceptFollowRequestInDatabase(
            followRequest.id
          );

          await Promise.all([
            refreshFollows(),
            refreshFollowRequests(),
          ]);
        } catch (error) {
          console.error(
            'Failed to accept follow request:',
            error
          );

          await refreshFollowRequests();
        }
      }

      void approveFollowRequest();
    },
    [
      receivedFollowRequests,
      refreshFollows,
      refreshFollowRequests,
    ]
  );

  const declineFollowRequest = useCallback(
    (requestId: string) => {
      const request =
        receivedFollowRequests.find(
          (item) =>
            item.id === requestId
        );

      if (!request) {
        return;
      }

      const followRequest = request;

      setReceivedFollowRequests(
        (currentRequests) =>
          currentRequests.filter(
            (item) =>
              item.id !== followRequest.id
          )
      );

      async function rejectFollowRequest() {
        try {
          await declineFollowRequestInDatabase(
            followRequest.id
          );
        } catch (error) {
          console.error(
            'Failed to decline follow request:',
            error
          );

          await refreshFollowRequests();
        }
      }

      void rejectFollowRequest();
    },
    [
      receivedFollowRequests,
      refreshFollowRequests,
    ]
  );


  const removeFollowerByUserId = useCallback(
    (targetUserId: string) => {
      const normalizedUserId =
        normalizeUserId(targetUserId);

      if (
        !userId ||
        !normalizedUserId ||
        !followerUserIds.includes(
          normalizedUserId
        )
      ) {
        return;
      }

      const currentUserId = userId;

      setFollowerUserIds((currentIds) =>
        currentIds.filter(
          (currentId) =>
            currentId !== normalizedUserId
        )
      );

      async function deleteFollower() {
        try {
          await removeFollower(
            normalizedUserId,
            currentUserId
          );
        } catch (error) {
          console.error(
            'Failed to remove follower:',
            error
          );

          setFollowerUserIds(
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

      void deleteFollower();
    },
    [userId, followerUserIds]
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
      sentFollowRequests,
      receivedFollowRequests,
      isLoading,

      isFollowing,
      isFollower,
      isFollowRequested,

      followUser,
      unfollowUser,
      toggleFollow,

      requestFollow,
      cancelFollowRequest,
      acceptFollowRequest,
      declineFollowRequest,
      removeFollower:
        removeFollowerByUserId,

      getFollowingCount,
      getFollowerCount,

      getFollowingUserIds,
      getFollowerUserIds,
    }),
    [
      followedUserIds,
      followerUserIds,
      sentFollowRequests,
      receivedFollowRequests,
      isLoading,
      isFollowing,
      isFollower,
      isFollowRequested,
      followUser,
      unfollowUser,
      toggleFollow,
      requestFollow,
      cancelFollowRequest,
      acceptFollowRequest,
      declineFollowRequest,
      removeFollowerByUserId,
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