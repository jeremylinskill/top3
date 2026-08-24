import { useBlock } from '@/context/block-context';
import { useAuth } from '@/hooks/use-auth';
import {
  CollectionSummary,
  getCollectionsByIds,
} from '@/lib/supabase/collections';
import {
  acceptFollowRequest as acceptFollowRequestInDatabase,
  declineFollowRequest as declineFollowRequestInDatabase,
  FollowRequest,
  getFollowRequestSnapshot,
} from '@/lib/supabase/follow-requests';
import {
  getNotifications,
  markAllNotificationsRead as markAllReadInDatabase,
  markNotificationRead as markReadInDatabase,
  Notification,
} from '@/lib/supabase/notifications';
import {
  getProfileById,
  getProfilesByIds,
} from '@/lib/supabase/profiles';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import { UserProfile } from '@/types/user-profile';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type EnrichedNotification =
  Notification & {
    actor: UserProfile | null;
    collection: CollectionSummary | null;
  };

export type EnrichedFollowRequest =
  FollowRequest & {
    requester: UserProfile | null;
  };

type NotificationContextValue = {
  notifications: EnrichedNotification[];
  pendingFollowRequests: EnrichedFollowRequest[];
  unreadCount: number;
  pendingFollowRequestCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (
    notificationId: string
  ) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  acceptFollowRequest: (
    requestId: string
  ) => Promise<void>;
  declineFollowRequest: (
    requestId: string
  ) => Promise<void>;
};

type NotificationProviderProps = {
  children: ReactNode;
};

const NotificationContext =
  createContext<
    NotificationContextValue | undefined
  >(undefined);

async function enrichNotifications(
  notifications: Notification[]
): Promise<EnrichedNotification[]> {
  const actorUserIds = notifications.map(
    (notification) =>
      notification.actorUserId
  );

  const collectionIds = notifications
    .map(
      (notification) =>
        notification.collectionId
    )
    .filter(
      (
        collectionId
      ): collectionId is string =>
        Boolean(collectionId)
    );

  const [
    actorProfiles,
    collectionSummaries,
  ] = await Promise.all([
    getProfilesByIds(
      actorUserIds
    ),
    getCollectionsByIds(
      collectionIds
    ),
  ]);

  const profilesByUserId = new Map(
    actorProfiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const collectionsById = new Map(
    collectionSummaries.map(
      (collection) => [
        collection.id,
        collection,
      ]
    )
  );

  return notifications.map(
    (notification) => ({
      ...notification,
      actor:
        profilesByUserId.get(
          notification.actorUserId
        ) ?? null,
      collection:
        notification.collectionId
          ? collectionsById.get(
              notification.collectionId
            ) ?? null
          : null,
    })
  );
}

async function enrichFollowRequests(
  requests: FollowRequest[]
): Promise<EnrichedFollowRequest[]> {
  const uniqueRequesterUserIds = Array.from(
    new Set(
      requests.map(
        (request) =>
          request.requesterUserId
      )
    )
  );

  const requesterProfiles =
    await Promise.all(
      uniqueRequesterUserIds.map(
        async (requesterUserId) => {
          try {
            return await getProfileById(
              requesterUserId
            );
          } catch (error) {
            console.error(
              'Failed to load follow request profile:',
              error
            );

            return null;
          }
        }
      )
    );

  const profilesByUserId = new Map(
    requesterProfiles
      .filter(
        (
          profile
        ): profile is UserProfile =>
          profile !== null
      )
      .map((profile) => [
        profile.id,
        profile,
      ])
  );

  return requests.map((request) => ({
    ...request,
    requester:
      profilesByUserId.get(
        request.requesterUserId
      ) ?? null,
  }));
}

export function NotificationProvider({
  children,
}: NotificationProviderProps) {
  const { user } = useAuth();
  const { blockedUserIds } = useBlock();

  const [notifications, setNotifications] =
    useState<EnrichedNotification[]>([]);

  const [
    pendingFollowRequests,
    setPendingFollowRequests,
  ] = useState<EnrichedFollowRequest[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const userId = user?.id;

  const refreshNotifications =
    useCallback(async () => {
      if (!userId) {
        setNotifications([]);
        setPendingFollowRequests([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [
          loadedNotifications,
          followRequestSnapshot,
        ] = await Promise.all([
          getNotifications(userId),
          getFollowRequestSnapshot(userId),
        ]);

        const [
          enrichedNotifications,
          enrichedFollowRequests,
        ] = await Promise.all([
          enrichNotifications(
            loadedNotifications
          ),
          enrichFollowRequests(
            followRequestSnapshot.receivedRequests
          ),
        ]);

        setNotifications(
          enrichedNotifications
        );

        setPendingFollowRequests(
          enrichedFollowRequests
        );
      } catch (error) {
        console.error(
          'Failed to load notifications:',
          error
        );
      } finally {
        setIsLoading(false);
      }
    }, [userId]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribeFromNotifications =
      subscribeToTableChanges({
        channelName:
          `notifications-${userId}`,
        table: 'notifications',
        filter:
          `recipient_user_id=eq.${userId}`,
        onChange: refreshNotifications,
      });

    const unsubscribeFromFollowRequests =
      subscribeToTableChanges({
        channelName:
          `notification-follow-requests-${userId}`,
        table: 'follow_requests',
        filter:
          `recipient_user_id=eq.${userId}`,
        onChange: refreshNotifications,
      });

    return () => {
      unsubscribeFromNotifications();
      unsubscribeFromFollowRequests();
    };
  }, [
    userId,
    refreshNotifications,
  ]);

  const visibleNotifications =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !blockedUserIds.includes(
              notification.actorUserId
            )
        ),
      [
        blockedUserIds,
        notifications,
      ]
    );

  const visiblePendingFollowRequests =
    useMemo(
      () =>
        pendingFollowRequests.filter(
          (request) =>
            !blockedUserIds.includes(
              request.requesterUserId
            )
        ),
      [
        blockedUserIds,
        pendingFollowRequests,
      ]
    );

  const unreadCount = useMemo(
    () =>
      visibleNotifications.filter(
        (notification) =>
          !notification.isRead
      ).length,
    [visibleNotifications]
  );

  const pendingFollowRequestCount =
    visiblePendingFollowRequests.length;

  const markNotificationRead =
    useCallback(
      async (notificationId: string) => {
        const existingNotification =
          notifications.find(
            (notification) =>
              notification.id ===
              notificationId
          );

        if (
          !existingNotification ||
          existingNotification.isRead
        ) {
          return;
        }

        setNotifications(
          (currentNotifications) =>
            currentNotifications.map(
              (notification) =>
                notification.id ===
                notificationId
                  ? {
                      ...notification,
                      isRead: true,
                    }
                  : notification
            )
        );

        try {
          await markReadInDatabase(
            notificationId
          );
        } catch (error) {
          console.error(
            'Failed to mark notification as read:',
            error
          );

          setNotifications(
            (currentNotifications) =>
              currentNotifications.map(
                (notification) =>
                  notification.id ===
                  notificationId
                    ? {
                        ...notification,
                        isRead: false,
                      }
                    : notification
              )
          );

          throw error;
        }
      },
      [notifications]
    );

  const markAllNotificationsRead =
    useCallback(async () => {
      if (!userId || unreadCount === 0) {
        return;
      }

      const previousNotifications =
        notifications;

      setNotifications(
        (currentNotifications) =>
          currentNotifications.map(
            (notification) => ({
              ...notification,
              isRead: true,
            })
          )
      );

      try {
        await markAllReadInDatabase(
          userId
        );
      } catch (error) {
        console.error(
          'Failed to mark all notifications as read:',
          error
        );

        setNotifications(
          previousNotifications
        );

        throw error;
      }
    }, [
      notifications,
      unreadCount,
      userId,
    ]);

  const acceptFollowRequest =
    useCallback(
      async (requestId: string) => {
        const request =
          visiblePendingFollowRequests.find(
            (item) =>
              item.id === requestId
          );

        if (!request) {
          return;
        }

        setPendingFollowRequests(
          (currentRequests) =>
            currentRequests.filter(
              (item) =>
                item.id !== request.id
            )
        );

        try {
          await acceptFollowRequestInDatabase(
            request.id
          );

          await refreshNotifications();
        } catch (error) {
          console.error(
            'Failed to accept follow request:',
            error
          );

          await refreshNotifications();
          throw error;
        }
      },
      [
        visiblePendingFollowRequests,
        refreshNotifications,
      ]
    );

  const declineFollowRequest =
    useCallback(
      async (requestId: string) => {
        const request =
          visiblePendingFollowRequests.find(
            (item) =>
              item.id === requestId
          );

        if (!request) {
          return;
        }

        setPendingFollowRequests(
          (currentRequests) =>
            currentRequests.filter(
              (item) =>
                item.id !== request.id
            )
        );

        try {
          await declineFollowRequestInDatabase(
            request.id
          );

          await refreshNotifications();
        } catch (error) {
          console.error(
            'Failed to decline follow request:',
            error
          );

          await refreshNotifications();
          throw error;
        }
      },
      [
        visiblePendingFollowRequests,
        refreshNotifications,
      ]
    );

  const contextValue =
    useMemo<NotificationContextValue>(
      () => ({
        notifications:
          visibleNotifications,
        pendingFollowRequests:
          visiblePendingFollowRequests,
        unreadCount,
        pendingFollowRequestCount,
        isLoading,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        acceptFollowRequest,
        declineFollowRequest,
      }),
      [
        visibleNotifications,
        visiblePendingFollowRequests,
        unreadCount,
        pendingFollowRequestCount,
        isLoading,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        acceptFollowRequest,
        declineFollowRequest,
      ]
    );

  return (
    <NotificationContext.Provider
      value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(
    NotificationContext
  );

  if (!context) {
    throw new Error(
      'useNotifications must be used inside a NotificationProvider'
    );
  }

  return context;
}