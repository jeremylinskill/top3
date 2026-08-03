import { useAuth } from '@/hooks/use-auth';
import {
    CollectionSummary,
    getCollectionsByIds,
} from '@/lib/supabase/collections';
import {
    getNotifications,
    markAllNotificationsRead as markAllReadInDatabase,
    markNotificationRead as markReadInDatabase,
    Notification,
} from '@/lib/supabase/notifications';
import {
    getPublicProfilesByIds,
} from '@/lib/supabase/profiles';
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

type NotificationContextValue = {
  notifications: EnrichedNotification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (
    notificationId: string
  ) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
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
    getPublicProfilesByIds(
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

export function NotificationProvider({
  children,
}: NotificationProviderProps) {
  const { user } = useAuth();

  const [notifications, setNotifications] =
    useState<EnrichedNotification[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const userId = user?.id;

  const refreshNotifications =
    useCallback(async () => {
      if (!userId) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const loadedNotifications =
          await getNotifications(userId);

        const enrichedNotifications =
          await enrichNotifications(
            loadedNotifications
          );

        setNotifications(
          enrichedNotifications
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
    refreshNotifications();
  }, [refreshNotifications]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.isRead
      ).length,
    [notifications]
  );

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

  const contextValue =
    useMemo<NotificationContextValue>(
      () => ({
        notifications,
        unreadCount,
        isLoading,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
      }),
      [
        notifications,
        unreadCount,
        isLoading,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
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