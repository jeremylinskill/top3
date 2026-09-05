import ActionSheet from '@/components/action-sheet';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import Card from '@/components/ui/card';
import SecondaryActionPill from '@/components/ui/secondary-action-pill';
import SectionHeader from '@/components/ui/section-header';
import UserAvatar from '@/components/user-avatar';
import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
import { useBlock } from '@/context/block-context';
import {
  EnrichedFollowRequest,
  EnrichedNotification,
  useNotifications,
} from '@/context/notification-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
        : 'liked your list.';

    case 'comment':
      return collectionTitle
        ? `commented on your ${collectionTitle}.`
        : 'commented on your list.';

    case 'follow':
      return 'started following you.';

    case 'follow_request_accepted':
      return 'accepted your follow request.';

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
    pendingFollowRequests,
    unreadCount,
    pendingFollowRequestCount,
    isLoading,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    acceptFollowRequest,
    declineFollowRequest,
  } = useNotifications();

  const { blockedUserIds } = useBlock();

  const visibleNotifications = useMemo(
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

  const visiblePendingFollowRequests = useMemo(
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

  const visibleUnreadCount = useMemo(
    () =>
      visibleNotifications.filter(
        (notification) =>
          !notification.isRead
      ).length,
    [visibleNotifications]
  );

  const visiblePendingFollowRequestCount =
    visiblePendingFollowRequests.length;

  const [
    isMarkingAllRead,
    setIsMarkingAllRead,
  ] = useState(false);

  const [
    activeFollowRequestId,
    setActiveFollowRequestId,
  ] = useState<string | null>(null);

  const [
    notificationError,
    setNotificationError,
  ] = useState<{
    title: string;
    message: string;
  } | null>(null);

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
        notification.type === 'follow' ||
        notification.type ===
          'follow_request_accepted'
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

  function openRequesterProfile(
    request: EnrichedFollowRequest
  ) {
    router.push({
      pathname: '/public-profile',
      params: {
        userId: request.requesterUserId,
      },
    });
  }

  async function handleAcceptFollowRequest(
    requestId: string
  ) {
    if (activeFollowRequestId) {
      return;
    }

    setActiveFollowRequestId(requestId);

    try {
      await acceptFollowRequest(requestId);
    } catch (error) {
      console.error(
        'Failed to accept follow request:',
        error
      );

      setNotificationError({
        title: 'Unable to accept request',
        message: 'Please try again.',
      });
    } finally {
      setActiveFollowRequestId(null);
    }
  }

  async function handleDeclineFollowRequest(
    requestId: string
  ) {
    if (activeFollowRequestId) {
      return;
    }

    setActiveFollowRequestId(requestId);

    try {
      await declineFollowRequest(requestId);
    } catch (error) {
      console.error(
        'Failed to decline request:',
        error
      );

      setNotificationError({
        title: 'Unable to decline request',
        message: 'Please try again.',
      });
    } finally {
      setActiveFollowRequestId(null);
    }
  }

  async function handleMarkAllRead() {
    if (
      visibleUnreadCount === 0 ||
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

      setNotificationError({
        title: 'Unable to update notifications',
        message: 'Please try again.',
      });
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  return (
    <>
      <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader />

      <PageHeader
        title="Notifications"
        subtitle={
          visiblePendingFollowRequestCount > 0
            ? visiblePendingFollowRequestCount === 1
              ? 'You have 1 follow request.'
              : `You have ${visiblePendingFollowRequestCount} follow requests.`
            : visibleUnreadCount === 0
              ? 'You’re all caught up.'
              : visibleUnreadCount === 1
                ? 'You have 1 unread notification.'
                : `You have ${visibleUnreadCount} unread notifications.`
        }
      />

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
        visibleNotifications.length === 0 &&
        visiblePendingFollowRequests.length === 0 ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator size="large" />

            <Text style={styles.messageText}>
              Loading notifications...
            </Text>
          </View>
        ) : visibleNotifications.length === 0 &&
          visiblePendingFollowRequests.length === 0 ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageTitle}>
              No notifications yet
            </Text>

            <Text style={styles.messageText}>
              Likes, comments, follow requests, and
              new followers will appear here.
            </Text>
          </View>
        ) : (
          <>
            {visiblePendingFollowRequests.length > 0 ? (
              <View style={styles.followRequestsSection}>
                <Text style={styles.sectionTitle}>
                  Follow Requests
                </Text>

                {visiblePendingFollowRequests.map(
                  (request) => {
                    const requesterName =
                      request.requester?.displayName ||
                      request.requester?.username ||
                      'Someone';

                    const isRequestActive =
                      activeFollowRequestId ===
                      request.id;

                    const actionsDisabled =
                      activeFollowRequestId !== null;

                    return (
                      <View
                        key={request.id}
                        style={styles.followRequestRow}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.requesterProfile,
                            pressed && styles.pressed,
                          ]}
                          onPress={() =>
                            openRequesterProfile(
                              request
                            )
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${requesterName}'s profile`}>
                          <UserAvatar
                            displayName={requesterName}
                            avatarUrl={request.requester?.avatarUrl}
                            size={48}
                          />

                          <View
                            style={
                              styles.followRequestBody
                            }>
                            <Text
                              style={
                                styles.followRequestMessage
                              }>
                              <Text
                                style={
                                  styles.followRequestName
                                }>
                                {requesterName}
                              </Text>{' '}
                              requested to follow you.
                            </Text>

                            <Text
                              style={
                                styles.notificationTime
                              }>
                              {formatNotificationTime(
                                request.createdAt
                              )}
                            </Text>
                          </View>
                        </Pressable>

                        <View
                          style={
                            styles.followRequestActions
                          }>
                          <Pressable
                            style={({ pressed }) => [
                              styles.acceptButton,
                              pressed &&
                                !actionsDisabled &&
                                styles.pressed,
                              actionsDisabled &&
                                styles.disabledButton,
                            ]}
                            onPress={() =>
                              void handleAcceptFollowRequest(
                                request.id
                              )
                            }
                            disabled={actionsDisabled}
                            accessibilityRole="button"
                            accessibilityLabel={`Accept ${requesterName}'s follow request`}>
                            {isRequestActive ? (
                              <ActivityIndicator
                                size="small"
                                color="#FFFFFF"
                              />
                            ) : (
                              <Text
                                style={
                                  styles.acceptButtonText
                                }>
                                Accept
                              </Text>
                            )}
                          </Pressable>

                          <Pressable
                            style={({ pressed }) => [
                              styles.declineIconButton,
                              pressed &&
                                !actionsDisabled &&
                                styles.pressed,
                              actionsDisabled &&
                                styles.disabledButton,
                            ]}
                            onPress={() =>
                              void handleDeclineFollowRequest(
                                request.id
                              )
                            }
                            disabled={actionsDisabled}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={`Decline ${requesterName}'s follow request`}>
                            <Ionicons
                              name="close-outline"
                              size={20}
                              color="#777777"
                            />
                          </Pressable>
                        </View>
                      </View>
                    );
                  }
                )}
              </View>
            ) : null}

            {visibleNotifications.length > 0 ? (
              <View style={styles.activitySection}>
                <SectionHeader
                  title="Recent Activity"
                  action={
                    <SecondaryActionPill
                      icon="eye-outline"
                      label={
                        isMarkingAllRead
                          ? 'Marking as read...'
                          : 'Mark all as read'
                      }
                      onPress={handleMarkAllRead}
                      disabled={
                        visibleUnreadCount === 0 ||
                        isMarkingAllRead
                      }
                    />
                  }
                />

                {visibleNotifications.map((notification) => {
                  const actorName =
                    notification.actor?.displayName ||
                    notification.actor?.username ||
                    'Someone';

                  return (
                    <Card
                      key={notification.id}
                      style={styles.notificationRow}>
                      <Pressable
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
                          styles.notificationPressable,
                          pressed && styles.pressed,
                        ]}>
                        <UserAvatar
                          displayName={actorName}
                          avatarUrl={notification.actor?.avatarUrl}
                          size={48}
                        />

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
                                    'list'}
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
                                    'list'}
                                </Text>
                                .
                              </>
                            ) : notification.type ===
                              'follow' ? (
                              'started following you.'
                            ) : notification.type ===
                              'follow_request_accepted' ? (
                              'accepted your follow request.'
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
                    </Card>
                  );
                })}
              </View>
            ) : null}
          </>
        )}
        </ScrollView>
      </SafeAreaView>

      <ActionSheet
        visible={notificationError !== null}
        title={notificationError?.title ?? ''}
        message={notificationError?.message}
        actions={[
          {
            label: 'OK',
            onPress: () => {
              setNotificationError(null);
            },
          },
        ]}
        onClose={() => {
          setNotificationError(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    ...TYPOGRAPHY.sectionTitle,
    textAlign: 'center',
  },

  messageText: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 8,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  followRequestsSection: {
    paddingBottom: 20,
  },

  activitySection: {
    paddingTop: 0,
  },

  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    paddingHorizontal: 20,
  },

  followRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  requesterProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  followRequestBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    paddingTop: 1,
  },

  followRequestName: {
    fontWeight: '700',
    color: COLORS.text,
  },

  followRequestMessage: {
    ...TYPOGRAPHY.body,
  },

  followRequestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 8,
    gap: 4,
  },

  acceptButton: {
    minWidth: 76,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.text,
  },

  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  declineIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.55,
  },

  notificationRow: {
    marginHorizontal: 20,
    marginBottom: 12,
  },

  notificationPressable: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  notificationBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },

  notificationText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },

  actorName: {
    fontWeight: '700',
  },

  collectionTitle: {
    fontWeight: '600',
  },

  notificationTime: {
    ...TYPOGRAPHY.metadata,
    marginTop: 4,
  },

  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },

  pressed: {
    opacity: 0.7,
  },
});