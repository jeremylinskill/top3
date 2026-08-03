import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import {
    EnrichedNotification,
    useNotifications,
} from '@/context/notification-context';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getNotificationMessage(
  notification: EnrichedNotification
) {
  const collectionTitle =
    notification.collection?.title;

  switch (notification.type) {
    case 'like':
      return collectionTitle
        ? `liked your ${collectionTitle}.`
        : 'liked your collection.';

    case 'comment':
      return collectionTitle
        ? `commented on your ${collectionTitle}.`
        : 'commented on your collection.';

    case 'follow':
      return 'started following you.';

    default:
      return 'interacted with your profile.';
  }
}

function formatNotificationTime(
  createdAt: string
) {
  const createdTime = new Date(
    createdAt
  ).getTime();

  const elapsedMilliseconds =
    Date.now() - createdTime;

  if (
    !Number.isFinite(createdTime) ||
    elapsedMilliseconds < 0
  ) {
    return '';
  }

  const elapsedMinutes = Math.floor(
    elapsedMilliseconds / 60000
  );

  if (elapsedMinutes < 1) {
    return 'Just now';
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const elapsedHours = Math.floor(
    elapsedMinutes / 60
  );

  if (elapsedHours < 24) {
    return `${elapsedHours}h`;
  }

  const elapsedDays = Math.floor(
    elapsedHours / 24
  );

  if (elapsedDays < 7) {
    return `${elapsedDays}d`;
  }

  return new Date(createdAt).toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
    }
  );
}

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useNotifications();

  const [
    isMarkingAllRead,
    setIsMarkingAllRead,
  ] = useState(false);

  async function handleNotificationPress(
    notification: EnrichedNotification
  ) {
    try {
      if (!notification.isRead) {
        await markNotificationRead(
          notification.id
        );
      }

      if (
        notification.type === 'follow'
      ) {
        router.push({
          pathname: '/public-profile',
          params: {
            userId: notification.actorUserId,
          },
        });

        return;
      }

      if (notification.collectionId) {
        router.push({
          pathname: '/published-top3',
          params: {
            postId:
              `post-${notification.collectionId}`,
          },
        });
      }
    } catch (error) {
      console.error(
        'Failed to open notification:',
        error
      );
    }
  }

  async function handleMarkAllRead() {
    if (
      unreadCount === 0 ||
      isMarkingAllRead
    ) {
      return;
    }

    setIsMarkingAllRead(true);

    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error(
        'Failed to mark all notifications as read:',
        error
      );

      Alert.alert(
        'Unable to update notifications',
        'Please try again.'
      );
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader />

      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount === 0
            ? 'You’re all caught up.'
            : unreadCount === 1
              ? 'You have 1 unread notification.'
              : `You have ${unreadCount} unread notifications.`
        }
      />

      {notifications.length > 0 ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            disabled={
              unreadCount === 0 ||
              isMarkingAllRead
            }
            hitSlop={8}
            onPress={handleMarkAllRead}
            style={({ pressed }) => [
              styles.markAllButton,
              pressed &&
                unreadCount > 0 &&
                !isMarkingAllRead &&
                styles.pressed,
            ]}>
            <Text
              style={[
                styles.markAllButtonText,
                unreadCount === 0 &&
                  styles.markAllButtonTextDisabled,
              ]}>
              {isMarkingAllRead
                ? 'Marking as read...'
                : 'Mark all as read'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshNotifications}
          />
        }>
        {isLoading &&
        notifications.length === 0 ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator size="large" />

            <Text style={styles.messageText}>
              Loading notifications...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageTitle}>
              No notifications yet
            </Text>

            <Text style={styles.messageText}>
              Likes, comments, and new followers
              will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => {
            const actorName =
              notification.actor?.displayName ||
              notification.actor?.username ||
              'Someone';

            const actorInitial = actorName
              .charAt(0)
              .toUpperCase();

            return (
              <Pressable
                key={notification.id}
                accessibilityRole="button"
                accessibilityLabel={`${actorName} ${getNotificationMessage(
                  notification
                )}`}
                onPress={() =>
                  handleNotificationPress(
                    notification
                  )
                }
                style={({ pressed }) => [
                  styles.notificationRow,
                  !notification.isRead &&
                    styles.unreadRow,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.avatar}>
                  {notification.actor?.avatarUrl ? (
                    <Image
                      source={{
                        uri: notification.actor
                          .avatarUrl,
                      }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={styles.avatarInitial}>
                      {actorInitial}
                    </Text>
                  )}
                </View>

                <View style={styles.notificationBody}>
                  <Text style={styles.notificationText}>
                    <Text style={styles.actorName}>
                      {actorName}
                    </Text>{' '}
                    {notification.type === 'like' ? (
                      <>
                        liked your{' '}
                        <Text
                          style={
                            styles.collectionTitle
                          }>
                          {notification.collection
                            ?.title ??
                            'collection'}
                        </Text>
                        .
                      </>
                    ) : notification.type ===
                      'comment' ? (
                      <>
                        commented on your{' '}
                        <Text
                          style={
                            styles.collectionTitle
                          }>
                          {notification.collection
                            ?.title ??
                            'collection'}
                        </Text>
                        .
                      </>
                    ) : notification.type ===
                      'follow' ? (
                      'started following you.'
                    ) : (
                      'interacted with your profile.'
                    )}
                  </Text>

                  <Text style={styles.notificationTime}>
                    {formatNotificationTime(
                      notification.createdAt
                    )}
                  </Text>
                </View>

                {!notification.isRead ? (
                  <View
                    style={styles.unreadIndicator}
                    accessibilityLabel="Unread"
                  />
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  actions: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  markAllButton: {
    minHeight: 30,
    justifyContent: 'center',
  },

  markAllButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1573DD',
  },

  markAllButtonTextDisabled: {
    color: COLORS.tertiaryText,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingBottom: 40,
  },

  messageContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  messageTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  notificationRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  unreadRow: {
    backgroundColor: '#F2F7FD',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.text,
    overflow: 'hidden',
  },

  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  notificationBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },

  notificationText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    color: COLORS.text,
  },

  actorName: {
    fontWeight: '700',
  },

  collectionTitle: {
    fontWeight: '600',
  },

  notificationTime: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.tertiaryText,
  },

  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1573DD',
  },

  pressed: {
    opacity: 0.7,
  },
});