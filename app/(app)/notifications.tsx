import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import IconButton from '@/components/icon-button';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import { Platform as NavPlatform } from 'react-native';
import Card from '@/components/ui/card';
import SecondaryActionPill from '@/components/ui/secondary-action-pill';
import SectionHeader from '@/components/ui/section-header';
import UserAvatar from '@/components/user-avatar';
import { useBlock } from '@/context/block-context';
import { useTop3 } from '@/context/top3-context';
import { useCollectionOptions } from '@/context/collection-options-context';
import { TOP3_CATEGORIES, type CategoryId } from '@/constants/top3-categories';
import type { NotificationDestination } from '@/types/notification-destination';
import { resolveNotificationCollection } from '@/utils/resolve-notification-collection';
import { getTop3RequestNotificationTitle, getTop3RequestMessageParts } from '@/supabase/functions/_shared/top3-request-notification-copy';
import { getFulfilledTop3RequestMessage } from '@/supabase/functions/_shared/top3-request-fulfilled-copy';
import {
  FLOATING_TAB_BAR_BOTTOM_SPACING,
  FLOATING_TAB_BAR_HEIGHT,
} from '@/context/tab-bar-scroll-context';
import {
  EnrichedFollowRequest,
  EnrichedNotification,
  useNotifications,
} from '@/context/notification-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { registerForPushNotifications } from '@/lib/notifications';
import { upsertPushToken } from '@/lib/supabase/push-tokens';
import {
  getPushNotificationsEnabled,
  setPushNotificationsEnabled,
} from '@/services/onboarding-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import Reanimated from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function getTop3RequestTitle(notification: EnrichedNotification): string | null {
  const request = notification.top3Request;
  return getTop3RequestNotificationTitle(request ? {
    categoryId: request.categoryId,
    destinationKind: request.destinationKind,
    topicLabel: request.topicLabel,
  } : null);
}

function getNotificationMessage(
  notification: EnrichedNotification,
  requestTitle?: string | null,
  requesterName?: string
) {
  const collectionTitle =
    notification.collection?.title;

  switch (notification.type) {
    case 'top3_request':
      return notification.top3Request?.status === 'fulfilled'
        ? `You shared your ${requestTitle?.trim() || 'Top 3'} with ${requesterName || 'the requester'}. Tap to view.`
        : getTop3RequestMessageParts(requestTitle).message;
    case 'top3_request_fulfilled':
      return getFulfilledTop3RequestMessage(collectionTitle ?? null);
    case 'announcement':
      return notification.announcement
        ? `${notification.announcement.title}. ${notification.announcement.message}`
        : 'Top 3 announcement.';

    case 'like':
      return collectionTitle
        ? `liked your ${collectionTitle}.`
        : 'liked your list.';

    case 'comment':
      return collectionTitle
        ? `commented on your ${collectionTitle}.`
        : 'commented on your list.';

    case 'comment_reply':
      return 'replied to your comment.';

    case 'comment_like':
      return 'liked your comment.';

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

const REMINDER_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const REMINDER_DISMISSAL_LIMIT = 3;

function reminderStorageKey(userId: string) {
  return `top3:push-reminder:v1:${userId}`;
}

type ReminderPreference = {
  dismissedCount: number;
  showAfter: number;
};

export default function NotificationsScreen() {
  const colors = useAppColors();
  const isDarkMode = useColorScheme() === 'dark';
  // Match the app's inverted preview-card treatment in either appearance.
  const reminderSurface = isDarkMode ? '#FFFFFF' : '#101010';
  const reminderInk = isDarkMode ? '#101010' : '#FFFFFF';
  const reminderSecondaryInk = isDarkMode ? '#555555' : '#D0D0D0';
  const reminderOutline = isDarkMode ? '#C8C8C8' : '#707070';
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  // Native iOS refresh stays below the wordmark without a second spinner.
  const nativeRefreshInsetTop = NavPlatform.OS === 'ios'
    ? insets.top + SCREEN_HEADER_HEIGHT
    : 0;
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const {
    scrollHandler: onStickyHeaderScroll,
    headerStyle: stickyHeaderStyle,
    scrollY: floatingCircleScrollY,
  } = useHomeStickyHeader(handleScroll, setHeaderScrolled, nativeRefreshInsetTop);

  function handleScroll(offsetY: number) {
    const y = Math.max(0, offsetY);
    setHeaderScrolled(y > 56);

  }
  const bottomScrollClearance = Math.max(
    40,
    insets.bottom +
      FLOATING_TAB_BAR_BOTTOM_SPACING +
      FLOATING_TAB_BAR_HEIGHT +
      24
  );
  const {
    notifications,
    pendingFollowRequests,
    unreadCount,
    pendingFollowRequestCount,
    isLoading,
    loadError,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    acceptFollowRequest,
    declineFollowRequest,
  } = useNotifications();

  // Show the pull-to-refresh spinner only for a user-initiated pull.
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);

  // Re-fetch when users open Notifications or return from a push destination.
  // Supabase Realtime remains active, and pull-to-refresh still works.
  useFocusEffect(
    useCallback(() => {
      void refreshNotifications();
    }, [refreshNotifications])
  );

  // A contextual, opt-in reminder: no automatic OS prompts and no reminders
  // on other screens. Dismissals are private to this signed-in user/device.
  const [showPushReminder, setShowPushReminder] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const reminderBusyRef = useRef(false);
  const waitingForDeviceSettingsRef = useRef(false);
  const reminderReadVersionRef = useRef(0);
  const dismissedDuringThisVisitRef = useRef(false);

  const refreshPushReminder = useCallback(async () => {
    const userId = user?.id;
    const currentRead = ++reminderReadVersionRef.current;
    if (!userId || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
      setShowPushReminder(false);
      return;
    }
    if (reminderBusyRef.current) return;

    try {
      const [permission, optedIn, saved] = await Promise.all([
        Notifications.getPermissionsAsync(),
        getPushNotificationsEnabled(userId),
        AsyncStorage.getItem(reminderStorageKey(userId)),
      ]);
      if (currentRead !== reminderReadVersionRef.current || reminderBusyRef.current) return;

      const preference: ReminderPreference | null = saved ? JSON.parse(saved) : null;
      const dismissedCount = preference?.dismissedCount ?? 0;
      const showAfter = preference?.showAfter ?? 0;
      setShowPushReminder(
        !dismissedDuringThisVisitRef.current &&
        !(optedIn && permission.status === Notifications.PermissionStatus.GRANTED) &&
        dismissedCount < REMINDER_DISMISSAL_LIMIT &&
        Date.now() >= showAfter
      );
    } catch (error) {
      // An unknown state should not cause repeated reminders.
      setShowPushReminder(false);
      if (__DEV__) console.log('Unable to check notification reminder:', error);
    }
  }, [user?.id]);

  const finishEnablingPush = useCallback(async (userId: string) => {
    const { token } = await registerForPushNotifications();
    if (!token) return false;
    await upsertPushToken({ userId, expoPushToken: token, platform: Platform.OS as 'ios' | 'android' });
    await setPushNotificationsEnabled(userId, true);
    await AsyncStorage.removeItem(reminderStorageKey(userId)).catch(() => {});
    setShowPushReminder(false);
    return true;
  }, []);

  const handleEnablePushReminder = useCallback(async () => {
    const userId = user?.id;
    if (!userId || reminderBusyRef.current) return;
    reminderBusyRef.current = true;
    reminderReadVersionRef.current += 1;
    setIsEnablingPush(true);
    try {
      const permissions = await Notifications.getPermissionsAsync();
      if (
        permissions.status !== Notifications.PermissionStatus.GRANTED &&
        !permissions.canAskAgain
      ) {
        waitingForDeviceSettingsRef.current = true;
        // Open Settings only after a direct user tap. Returning to Top 3
        // finishes opt-in if the OS permission was granted.
        await Linking.openSettings();
        return;
      }
      const enabled = await finishEnablingPush(userId);
      if (!enabled) {
        Alert.alert('Notifications are off',
          'Allow notifications for Top 3 in your phone settings to receive updates.');
      }
    } catch (error) {
      waitingForDeviceSettingsRef.current = false;
      if (__DEV__) console.log('Unable to enable push from reminder:', error);
      Alert.alert('Unable to Enable Notifications',
        'Please try again or enable notifications in your phone settings.');
    } finally {
      reminderBusyRef.current = false;
      setIsEnablingPush(false);
      if (!waitingForDeviceSettingsRef.current) void refreshPushReminder();
    }
  }, [user?.id, finishEnablingPush, refreshPushReminder]);

  const handleDismissPushReminder = useCallback(async () => {
    const userId = user?.id;
    dismissedDuringThisVisitRef.current = true;
    reminderReadVersionRef.current += 1;
    setShowPushReminder(false);
    if (!userId) return;
    try {
      const key = reminderStorageKey(userId);
      const saved = await AsyncStorage.getItem(key);
      const previous: ReminderPreference | null = saved ? JSON.parse(saved) : null;
      await AsyncStorage.setItem(key, JSON.stringify({
        dismissedCount: (previous?.dismissedCount ?? 0) + 1,
        showAfter: Date.now() + REMINDER_COOLDOWN_MS,
      } satisfies ReminderPreference));
    } catch (error) {
      if (__DEV__) console.log('Unable to save notification reminder dismissal:', error);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    void refreshPushReminder();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (waitingForDeviceSettingsRef.current) {
        waitingForDeviceSettingsRef.current = false;
        // Only complete the user-initiated opt-in if OS permission was granted.
        void (async () => {
          const userId = user?.id;
          if (!userId || reminderBusyRef.current) return;
          reminderBusyRef.current = true;
          setIsEnablingPush(true);
          try {
            const permissions = await Notifications.getPermissionsAsync();
            if (permissions.status === Notifications.PermissionStatus.GRANTED) {
              await finishEnablingPush(userId);
            }
          } catch (error) {
            if (__DEV__) console.log('Unable to finish notification permission change:', error);
            Alert.alert('Unable to Enable Notifications',
              'Please try again or enable notifications in Top 3 Settings.');
          } finally {
            reminderBusyRef.current = false;
            setIsEnablingPush(false);
            void refreshPushReminder();
          }
        })();
      } else {
        void refreshPushReminder();
      }
    });
    return () => {
      subscription.remove();
      reminderReadVersionRef.current += 1;
      dismissedDuringThisVisitRef.current = false;
    };
  }, [user?.id, finishEnablingPush, refreshPushReminder]));

  const { lists, isCollectionsLoaded, hasCollectionsLoadError,
    startListWithoutSaving, selectList } = useTop3();
  const { options } = useCollectionOptions();
  const openingAnnouncementRef = useRef(false);

  const { blockedUserIds } = useBlock();

  const visibleNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          (!notification.actorUserId ||
            !blockedUserIds.includes(notification.actorUserId))
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

  async function handleDeleteNotification(notificationId: string) {
    if (deletingNotificationId !== null) return;
    setDeletingNotificationId(notificationId);
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      Alert.alert('Unable to delete notification',
        error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setDeletingNotificationId(null);
    }
  }

  async function handleNotificationPress(
    notification: EnrichedNotification
  ) {
    try {
      if (notification.type === 'top3_request') {
        // The notification identifies the precise request, even if others are pending.
        const requestId = notification.top3RequestId;
        if (!requestId) {
          Alert.alert('Request unavailable', 'Unable to identify this Top 3 request.');
          return;
        }
        if (!notification.isRead) await markNotificationRead(notification.id);
        router.push({ pathname: '/top3-requests-inbox', params: { requestId } });
        return;
      }
      if (notification.type === 'announcement') {
        if (openingAnnouncementRef.current) return;
        const announcement = notification.announcement;
        if (!announcement || !isCollectionsLoaded || hasCollectionsLoadError) {
          Alert.alert('Unable to Open Top 3',
            'Your lists are not available yet. Please try again.');
          return;
        }
        const category = TOP3_CATEGORIES.find(item =>
          item.id === announcement.categoryId);
        const kind = announcement.destinationKind;
        const optionId = announcement.optionId;
        if (!category || !(
          (kind === 'overall' && !optionId) ||
          ((kind === 'type' || kind === 'theme' || kind === 'genre') && optionId)
        )) {
          Alert.alert('Destination Unavailable',
            'This Top 3 destination is no longer available.');
          return;
        }
        const destination: NotificationDestination = kind === 'overall'
          ? { categoryId: category.id as CategoryId, kind: 'overall' }
          : { categoryId: category.id as CategoryId,
              kind: kind as 'type' | 'theme' | 'genre', optionId: optionId! };
        const input = resolveNotificationCollection(destination, options, { includePodcasts: true });
        if (!input) {
          Alert.alert('Destination Unavailable',
            'This Top 3 destination is no longer available.');
          return;
        }
        openingAnnouncementRef.current = true;
        try {
          const normalize = (value?: string) => {
            const normalized = value?.trim().toLowerCase() ?? '';
            return normalized === 'general' ? '' : normalized;
          };
          const matching = lists.filter(list => {
            if (normalize(list.category) !== normalize(input.category)) return false;
            if (input.collectionOptionId && list.collectionOptionId) {
              return normalize(input.collectionOptionId) === normalize(list.collectionOptionId);
            }
            return normalize(list.type) === normalize(input.type) &&
              normalize(list.topic) === normalize(input.topic);
          });
          const existing = matching.find(list => Boolean(list.publishedAt)) ??
            matching.find(list => list.items.some(item => item !== null)) ?? matching[0];
          const listId = existing
            ? (selectList(existing.id), existing.id)
            : startListWithoutSaving(input);
          if (!notification.isRead) await markNotificationRead(notification.id);
          router.push({ pathname: '/collection', params: { listId } });
        } finally {
          openingAnnouncementRef.current = false;
        }
        return;
      }

      if (!notification.isRead) {
        await markNotificationRead(notification.id);
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
        const shouldOpenComments =
          notification.type === 'comment' ||
          notification.type === 'comment_reply' ||
          notification.type === 'comment_like';

        router.push({
          pathname: '/published-top3',
          params: {
            postId:
              `post-${notification.collectionId}`,
            ...(shouldOpenComments
              ? {
                  openComments: 'true',
                }
              : {}),
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
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={['left', 'right']}>
      <Reanimated.View
        pointerEvents="box-none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + SCREEN_HEADER_HEIGHT + 16,
            zIndex: 30,
          },
          stickyHeaderStyle,
        ]}>
        <ScreenHeader overlay androidStatusBarGlass scrolled={headerScrolled} floatingCircleScrollY={floatingCircleScrollY} />
      </Reanimated.View>

      <Reanimated.ScrollView
        style={styles.scrollView}
        contentInset={NavPlatform.OS === 'ios' ? { top: nativeRefreshInsetTop } : undefined}
        contentOffset={NavPlatform.OS === 'ios' ? { x: 0, y: -nativeRefreshInsetTop } : undefined}
        contentInsetAdjustmentBehavior={NavPlatform.OS === 'ios' ? 'never' : undefined}
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: NavPlatform.OS === 'ios' ? 0 : SCREEN_HEADER_HEIGHT +
              insets.top,
            paddingBottom: bottomScrollClearance },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onStickyHeaderScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={() => {
              setIsPullRefreshing(true);
              void refreshNotifications().finally(() => {
                setIsPullRefreshing(false);
              });
            }}
            tintColor={colors.secondaryText}
            colors={[colors.secondaryText]}
          />
        }>
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

        {showPushReminder ? (
          <Card style={[styles.pushReminderCard, { backgroundColor: reminderSurface }]}>
            <View style={styles.pushReminderTop}>
              <View style={styles.pushReminderBody}>
                <AppText variant="headline" tone="invertedPrimary">Stay in the loop</AppText>
                <AppText variant="body" tone="invertedSecondary" style={styles.pushReminderDescription}>
                  Get inspired by timely topics and fresh ideas for your next Top 3, and stay connected with your community.
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification reminder"
                hitSlop={10}
                disabled={isEnablingPush}
                onPress={() => void handleDismissPushReminder()}
                style={styles.pushReminderClose}>
                <Ionicons name="close" size={20} color={reminderSecondaryInk} />
              </Pressable>
            </View>
            <View style={styles.pushReminderActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                disabled={isEnablingPush}
                onPress={() => void handleDismissPushReminder()}
                style={[styles.pushReminderButton, { borderColor: reminderOutline, borderWidth: 1 }]}>
                <AppText variant="label" tone="invertedPrimary">Not now</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enable notifications"
                disabled={isEnablingPush}
                onPress={() => void handleEnablePushReminder()}
                style={[styles.pushReminderButton, styles.pushReminderEnable, { backgroundColor: reminderInk }]}>
                {isEnablingPush ? <ActivityIndicator size="small" color={reminderSurface} /> : null}
                <AppText variant="label" emphasis="strong" tone="primary">
                  Enable notifications
                </AppText>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {isLoading &&
        visibleNotifications.length === 0 &&
        visiblePendingFollowRequests.length === 0 ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator
              size="large"
              color={colors.secondaryText}
            />

            <AppText
              variant="bodyLarge"
              tone="tertiary"
              style={styles.messageText}>
              Loading notifications...
            </AppText>
          </View>
        ) : loadError &&
          visibleNotifications.length === 0 &&
          visiblePendingFollowRequests.length === 0 ? (
          <View style={styles.messageContainer}>
            <AppText
              variant="sectionTitle"
              style={styles.messageTitle}>
              Couldn’t load notifications
            </AppText>

            <AppText
              variant="bodyLarge"
              tone="tertiary"
              style={styles.messageText}>
              Check your connection and try again.
            </AppText>

            <PrimaryButton
              title="Try Again"
              onPress={() => {
                void refreshNotifications();
              }}
              style={styles.retryButton}
            />
          </View>
        ) : visibleNotifications.length === 0 &&
          visiblePendingFollowRequests.length === 0 ? (
          <View style={styles.messageContainer}>
            <AppText
              variant="sectionTitle"
              style={styles.messageTitle}>
              No notifications yet
            </AppText>

            <AppText
              variant="bodyLarge"
              tone="tertiary"
              style={styles.messageText}>
              Likes, comments, follow requests, and
              new followers will appear here.
            </AppText>
          </View>
        ) : (
          <>
            {visiblePendingFollowRequests.length > 0 ? (
              <View style={styles.followRequestsSection}>
                <AppText
                  variant="sectionTitle"
                  style={styles.sectionTitle}>
                  Follow Requests
                </AppText>

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
                        style={[
                          styles.followRequestRow,
                          {
                            backgroundColor:
                              colors.background,
                            borderBottomColor:
                              colors.border,
                          },
                        ]}>
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
                            <AppText
                              variant="body"
                              tone="primary">
                              <AppText
                                variant="body"
                                tone="primary"
                                emphasis="strong">
                                {requesterName}
                              </AppText>{' '}
                              requested to follow you.
                            </AppText>

                            <AppText
                              variant="metadata"
                              tone="tertiary"
                              style={styles.notificationTime}>
                              {formatNotificationTime(
                                request.createdAt
                              )}
                            </AppText>
                          </View>
                        </Pressable>

                        <View
                          style={
                            styles.followRequestActions
                          }>
                          <Pressable
                            style={({ pressed }) => [
                              styles.acceptButton,
                              {
                                backgroundColor:
                                  colors.primary,
                              },
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
                                color={colors.onPrimary}
                              />
                            ) : (
                              <AppText
                                variant="label"
                                tone="onPrimary"
                                emphasis="strong">
                                Accept
                              </AppText>
                            )}
                          </Pressable>

                          <IconButton
                            size="navigation"
                            onPress={() => {
                              void handleDeclineFollowRequest(
                                request.id
                              );
                            }}
                            disabled={actionsDisabled}
                            accessibilityLabel={`Decline ${requesterName}'s follow request`}>
                            <Ionicons
                              name="close-outline"
                              size={20}
                              color={colors.tertiaryText}
                            />
                          </IconButton>
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
                    notification.type === 'announcement'
                      ? 'Top 3'
                      : notification.actor?.displayName ||
                    notification.actor?.username ||
                    'Someone';
                  const requestedTitle = notification.type === 'top3_request'
                    ? getTop3RequestTitle(notification)
                    : null;
                  const isFulfilledRequest = notification.type === 'top3_request' &&
                    notification.top3Request?.status === 'fulfilled';
                  const requestMessage = notification.type === 'top3_request'
                    ? getTop3RequestMessageParts(requestedTitle)
                    : null;

                  return (
                    <Swipeable
                      key={notification.id}
                      friction={2}
                      rightThreshold={42}
                      overshootRight={false}
                      containerStyle={styles.notificationRow}
                      renderRightActions={() => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete notification"
                          disabled={deletingNotificationId !== null}
                          onPress={() => void handleDeleteNotification(notification.id)}
                          style={[styles.notificationDeleteAction,
                            deletingNotificationId !== null && styles.disabledButton]}>
                          {deletingNotificationId === notification.id
                            ? <ActivityIndicator color="#FFFFFF" />
                            : <Ionicons name="trash-outline" size={23} color="#FFFFFF" />}
                          <Text style={styles.notificationDeleteLabel}>
                            Delete
                          </Text>
                        </Pressable>
                      )}>
                    <Card>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={notification.type === 'announcement' || isFulfilledRequest
                          ? getNotificationMessage(notification, requestedTitle, actorName)
                          : `${actorName} ${getNotificationMessage(notification, requestedTitle, actorName)}`}
                        onPress={() => handleNotificationPress(notification)}
                        disabled={deletingNotificationId === notification.id}
                        accessibilityActions={[{ name: 'delete', label: 'Delete notification' }]}
                        onAccessibilityAction={(event) => {
                          if (event.nativeEvent.actionName === 'delete') {
                            void handleDeleteNotification(notification.id);
                          }
                        }}
                        style={({ pressed }) => [
                          styles.notificationPressable,
                          pressed && styles.pressed,
                        ]}>
                        {notification.type === 'announcement' ? (
                          <View style={[styles.announcementIcon, {
                            backgroundColor: colors.accent,
                          }]}>
                            <Ionicons name="megaphone-outline" size={24} color="#FFFFFF" />
                          </View>
                        ) : (
                          <UserAvatar
                            displayName={actorName}
                            avatarUrl={notification.actor?.avatarUrl}
                            size={48}
                          />
                        )}

                        <View style={styles.notificationBody}>
                          {notification.type === 'announcement' ? (
                            <View>
                              <AppText variant="body" tone="primary" emphasis="strong">
                                {notification.announcement?.title ?? 'Top 3 announcement'}
                              </AppText>
                              <AppText variant="body" tone="primary">
                                {notification.announcement?.message ?? 'An announcement from Top 3.'}
                              </AppText>
                            </View>
                          ) : (
                          <AppText
                            variant="body"
                            tone="primary">
                            {!isFulfilledRequest ? (
                              <AppText
                                variant="body"
                                tone="primary"
                                emphasis="strong">
                                {actorName}
                              </AppText>
                            ) : null}
                            {!isFulfilledRequest ? ' ' : null}
                            {notification.type === 'like' ? (
                              <>
                                liked your{' '}
                                <AppText
                                  variant="body"
                                  tone="primary"
                                  emphasis="semibold">
                                  {notification.collection
                                    ?.title ??
                                    'list'}
                                </AppText>
                                .
                              </>
                            ) : notification.type ===
                              'comment' ? (
                              <>
                                commented on your{' '}
                                <AppText
                                  variant="body"
                                  tone="primary"
                                  emphasis="semibold">
                                  {notification.collection
                                    ?.title ??
                                    'list'}
                                </AppText>
                                .
                              </>
                            ) : notification.type ===
                              'comment_reply' ? (
                              'replied to your comment.'
                            ) : notification.type ===
                              'comment_like' ? (
                              'liked your comment.'
                            ) : notification.type === 'top3_request' ? (
                              isFulfilledRequest ? (
                                <>
                                  You shared your{' '}
                                  <AppText variant="body" tone="primary" emphasis="semibold">
                                    {requestedTitle || 'Top 3'}
                                  </AppText>
                                  {' '}with{' '}
                                  <AppText variant="body" tone="primary" emphasis="semibold">
                                    {actorName}
                                  </AppText>
                                  . Tap to view.
                                </>
                              ) : requestMessage?.title ? (
                                <>
                                  {requestMessage.beforeTitle}
                                  <AppText variant="body" tone="primary" emphasis="semibold">
                                    {requestMessage.title}
                                  </AppText>
                                  {requestMessage.afterTitle}
                                </>
                              ) : requestMessage?.message
                            ) : notification.type === 'top3_request_fulfilled' ? (
                              getFulfilledTop3RequestMessage(notification.collection?.title ?? null)
                            ) : notification.type ===
                              'follow' ? (
                              'started following you.'
                            ) : notification.type ===
                              'follow_request_accepted' ? (
                              'accepted your follow request.'
                            ) : (
                              'interacted with your profile.'
                            )}
                          </AppText>
                          )}

                          <AppText
                            variant="metadata"
                            tone="tertiary"
                            style={styles.notificationTime}>
                            {formatNotificationTime(
                              notification.createdAt
                            )}
                          </AppText>
                        </View>

                        {!notification.isRead ? (
                          <View
                            style={[
                              styles.unreadIndicator,
                              {
                                backgroundColor:
                                  colors.accent,
                              },
                            ]}
                            accessibilityLabel="Unread"
                          />
                        ) : null}
                      </Pressable>
                    </Card>
                    </Swipeable>
                  );
                })}
              </View>
            ) : null}
          </>
        )}
        </Reanimated.ScrollView>
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
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingTop: SCREEN_HEADER_HEIGHT,
    paddingBottom: 40,
  },

  pushReminderCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
  },
  pushReminderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pushReminderBody: {
    flex: 1,
    minWidth: 0,
  },
  pushReminderDescription: {
    marginTop: 4,
  },
  pushReminderClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    marginRight: -4,
  },
  pushReminderActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  pushReminderButton: {
    minHeight: 44,
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
  },
  pushReminderEnable: {
    flex: 1.5,
  },

  messageContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  messageTitle: {
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
    marginHorizontal: 20,
  },

  followRequestsSection: {
    paddingBottom: 20,
  },

  activitySection: {
    paddingTop: 0,
  },

  sectionTitle: {
    paddingHorizontal: 20,
  },

  followRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
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
  },


  disabledButton: {
    opacity: 0.55,
  },

  notificationRow: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  notificationDeleteAction: {
    width: 104,
    backgroundColor: '#C9272C',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  notificationDeleteLabel: {
    color: '#FFFFFF',
  },

  notificationPressable: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  announcementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },




  notificationTime: {
    marginTop: 4,
  },

  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  pressed: {
    opacity: 0.7,
  },
});