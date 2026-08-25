import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import Card from '@/components/ui/card';
import SecondaryActionPill from '@/components/ui/secondary-action-pill';
import SectionHeader from '@/components/ui/section-header';
import { COLORS } from '@/constants/colors';
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
        : 'liked your list.';

    case 'comment':
      return collectionTitle
        ? `commented on your ${collectionTitle}.`
        : 'commented on your list.';

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

      Alert.alert(
        'Unable to accept request',
        'Please try again.'
      );
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

      Alert.alert(
        'Unable to decline request',
        'Please try again.'
      );
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

                    const requesterInitial =
                      requesterName
                        .charAt(0)
                        .toUpperCase();

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
                          <View style={styles.avatar}>
                            {request.requester?.avatarUrl ? (
                              <Image
                                source={{
                                  uri: request.requester
                                    .avatarUrl,
                                }}
                                style={styles.avatarImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text
                                style={
                                  styles.avatarInitial
                                }>
                                {requesterInitial}
                              </Text>
                            )}
                          </View>

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

                  const actorInitial = actorName
                    .charAt(0)
                    .toUpperCase();

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

  followRequestsSection: {
    paddingBottom: 20,
  },

  activitySection: {
    paddingTop: 0,
  },

  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: COLORS.text,
  },

  followRequestRow: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.secondaryText,
  },

  followRequestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 12,
  },

  acceptButton: {
    width: 92,
    minHeight: 38,
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
    width: 38,
    height: 38,
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
    backgroundColor: '#5928ed',
  },

  pressed: {
    opacity: 0.7,
  },
});