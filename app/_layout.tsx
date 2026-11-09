import AudioPreviewSheet from '@/components/audio-preview-sheet';
import BookPreviewSheet from '@/components/book-preview-sheet';
import TrailerPreviewSheet from '@/components/trailer-preview-sheet';
import { AudioPreviewProvider } from '@/context/audio-preview-context';
import { BlockProvider } from '@/context/block-context';
import { BookPreviewProvider } from '@/context/book-preview-context';
import { CollectionOptionsProvider, useCollectionOptions } from '@/context/collection-options-context';
import { CommentProvider } from '@/context/comment-context';
import { FeedbackProvider } from '@/context/feedback-context';
import { FollowProvider } from '@/context/follow-context';
import { LikeProvider } from '@/context/like-context';
import { NotificationProvider } from '@/context/notification-context';
import { OnboardingCollectionProvider } from '@/context/onboarding-collection-context';
import { ProfileProvider } from '@/context/profile-context';
import { SavedItemsProvider } from '@/context/saved-items-context';
import { Top3Provider, useTop3 } from '@/context/top3-context';
import { TrailerPreviewProvider } from '@/context/trailer-preview-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { DM_NAV_ENABLED, GROUP_DM_ENABLED } from '@/lib/dm-availability';
import { initializeAnalytics } from '@/lib/analytics';
import {
  TOP3_CATEGORIES,
  type CategoryId,
} from '@/constants/top3-categories';
import type { NotificationDestination } from '@/types/notification-destination';
import { resolveNotificationCollection } from '@/utils/resolve-notification-collection';
import { AuthProvider } from '@/providers/auth-provider';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import {
  router,
  Stack,
  useGlobalSearchParams,
  usePathname,
  useRootNavigationState,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, AppState, Keyboard, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-reanimated';

// Only the foregrounded, signed-in conversation can suppress its own
// notification banner. A different conversation, an invitation, or an app in
// the background retains the existing notification behaviour.
type ForegroundMessageConversation = {
  type: 'direct_message' | 'group_message';
  id: string;
  recipientUserId: string;
};

let foregroundMessageConversation: ForegroundMessageConversation | null = null;

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const type = getStringValue(data.type);
    const conversationId = type === 'direct_message'
      ? getStringValue(data.conversationId)
      : type === 'group_message'
        ? getStringValue(data.groupId)
        : null;
    const recipientUserId = getStringValue(data.recipientUserId);
    const open = foregroundMessageConversation;
    const isOpenConversationMessage =
      AppState.currentState === 'active' &&
      open !== null &&
      type === open.type &&
      conversationId === open.id &&
      recipientUserId === open.recipientUserId;

    return {
      // Keep the configured notification sound, but do not duplicate the
      // message on screen or in Notification Centre for the open chat.
      shouldShowBanner: !isOpenConversationMessage,
      shouldShowList: !isOpenConversationMessage,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

type NotificationRouteData = {
  type?: unknown;
  actorUserId?: unknown;
  collectionId?: unknown;
  destination?: unknown;
  top3RequestId?: unknown;
  top3_request_id?: unknown;
  requestId?: unknown;
  conversationId?: unknown;
  groupId?: unknown;
  recipientUserId?: unknown;
};

function getStringValue(
  value: unknown
): string | null {
  return typeof value === 'string' &&
    value.trim()
    ? value.trim()
    : null;
}

function parseCampaignDestination(
  value: unknown
): NotificationDestination | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const { categoryId, kind, optionId } = data;

  if (
    typeof categoryId !== 'string' ||
    !TOP3_CATEGORIES.some(
      (category) =>
        category.id === categoryId
    )
  ) {
    return null;
  }

  if (kind === 'overall' && optionId === undefined) {
    return {
      categoryId: categoryId as CategoryId,
      kind: 'overall',
    };
  }

  if (
    (kind === 'type' || kind === 'theme' || kind === 'genre') &&
    typeof optionId === 'string' &&
    optionId.trim().length > 0
  ) {
    return {
      categoryId: categoryId as CategoryId,
      kind,
      optionId,
    };
  }

  return null;
}

function routeFromNotificationData(
  data: NotificationRouteData,
  currentUserId: string | null
) {
  const type =
    getStringValue(data.type);

  const collectionId =
    getStringValue(data.collectionId);

  const actorUserId =
    getStringValue(data.actorUserId);

  if (type === 'direct_message') {
    const conversationId = getStringValue(data.conversationId);
    const recipientUserId = getStringValue(data.recipientUserId);
    // Only route DM pushes in an explicitly enabled environment, and never
    // open a conversation for a different signed-in recipient.
    if (
      DM_NAV_ENABLED &&
      conversationId &&
      recipientUserId &&
      recipientUserId === currentUserId
    ) {
      router.push({ pathname: '/dm-conversation', params: { conversationId } });
    }
    return;
  }

  if (type === 'group_message' || type === 'group_invitation') {
    const groupId = getStringValue(data.groupId);
    const recipientUserId = getStringValue(data.recipientUserId);
    // Development-only group routing. The server sends a separate recipient
    // ID with each push, which must match the currently authenticated account.
    if (
      !GROUP_DM_ENABLED ||
      !groupId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId) ||
      !recipientUserId ||
      recipientUserId !== currentUserId
    ) {
      return;
    }
    if (type === 'group_invitation') {
      router.push('/messages');
    } else {
      router.push({ pathname: '/dm-group-conversation', params: { groupId } });
    }
    return;
  }

  if (type === 'top3_request') {
    const requestId =
      getStringValue(data.top3RequestId) ??
      getStringValue(data.top3_request_id) ??
      getStringValue(data.requestId);
    if (requestId) {
      router.push({ pathname: '/top3-requests-inbox', params: { requestId } });
    } else {
      // Older push payloads may omit the ID. Never guess among pending requests.
      router.push('/notifications');
    }
    return;
  }
  if (type === 'top3_request_fulfilled' && collectionId) {
    router.push({ pathname: '/published-top3', params: { postId: `post-${collectionId}` } });
    return;
  }

  if (
    type === 'like' &&
    collectionId
  ) {
    router.push({
      pathname: '/published-top3',
      params: {
        postId: `post-${collectionId}`,
      },
    });

    return;
  }

  if (
    (type === 'comment' ||
      type === 'comment_reply' ||
      type === 'comment_like') &&
    collectionId
  ) {
    router.push({
      pathname: '/published-top3',
      params: {
        postId: `post-${collectionId}`,
        openComments: 'true',
      },
    });

    return;
  }

  if (
    (type === 'follow' ||
      type === 'follow_request_accepted') &&
    actorUserId
  ) {
    router.push({
      pathname: '/public-profile',
      params: {
        userId: actorUserId,
      },
    });
  }
}

function NotificationResponseController() {
  const handledResponseIdRef =
    useRef<string | null>(null);
  const processingCampaignRef = useRef(false);
  const [pendingCampaign, setPendingCampaign] = useState<{
    responseId: string;
    destination: NotificationDestination;
  } | null>(null);

  const [pendingSocialNotification, setPendingSocialNotification] =
    useState<{
      responseId: string;
      data: NotificationRouteData;
    } | null>(null);

  const { isAuthenticated, user } = useAuth();
  const navigationState = useRootNavigationState();
  const pathname = usePathname();
  const { conversationId: activeConversationId, groupId: activeGroupId } =
    useGlobalSearchParams<{
      conversationId?: string;
      groupId?: string;
    }>();
  const segments = useSegments();
  const isInsideApp = segments[0] === '(app)';
  const { options } = useCollectionOptions();
  const {
    lists,
    isCollectionsLoaded,
    hasCollectionsLoadError,
    startListWithoutSaving,
    selectList,
  } = useTop3();

  // Track only the currently visible chat, not a conversation obscured by
  // another screen or one belonging to a previous signed-in account.
  useEffect(() => {
    const currentUserId = isAuthenticated && isInsideApp ? user?.id : null;
    let active: ForegroundMessageConversation | null = null;
    if (
      currentUserId &&
      DM_NAV_ENABLED &&
      pathname === '/dm-conversation' &&
      typeof activeConversationId === 'string' &&
      activeConversationId.length > 0
    ) {
      active = {
        type: 'direct_message',
        id: activeConversationId,
        recipientUserId: currentUserId,
      };
    } else if (
      currentUserId &&
      GROUP_DM_ENABLED &&
      pathname === '/dm-group-conversation' &&
      typeof activeGroupId === 'string' &&
      activeGroupId.length > 0
    ) {
      active = {
        type: 'group_message',
        id: activeGroupId,
        recipientUserId: currentUserId,
      };
    }

    foregroundMessageConversation = active;
    return () => {
      if (foregroundMessageConversation === active) {
        foregroundMessageConversation = null;
      }
    };
  }, [
    isAuthenticated,
    isInsideApp,
    user?.id,
    pathname,
    activeConversationId,
    activeGroupId,
  ]);

  useEffect(() => {
    function handleResponse(
      response:
        Notifications.NotificationResponse
    ) {
      const responseId =
        response.notification.request.identifier;

      if (
        handledResponseIdRef.current ===
        responseId
      ) {
        return;
      }

      handledResponseIdRef.current =
        responseId;

      const data =
        response.notification.request.content
          .data as NotificationRouteData;

      if (getStringValue(data.type) === 'top3_campaign') {
        const destination =
          parseCampaignDestination(data.destination);

        if (destination) {
          setPendingCampaign({
            responseId,
            destination,
          });
        }
        return;
      }

      setPendingSocialNotification({
        responseId,
        data,
      });
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        handleResponse
      );

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleResponse(response);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.log(
            'Failed to read last notification response:',
            error
          );
        }
      });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (
      !pendingSocialNotification ||
      !navigationState?.key ||
      pathname === '/' ||
      !isAuthenticated
    ) {
      return;
    }

    const { data } = pendingSocialNotification;

    if (getStringValue(data.type) === 'direct_message') {
      // Notification responses can arrive before auth finishes restoring the
      // signed-in user and before the protected app stack is mounted.
      // Do not discard this response until both are ready.
      if (!user?.id || !isInsideApp) {
        return;
      }

      // The server provides the recipient identity. Never route a notification
      // for another account into the currently signed-in account's session.
      const recipientUserId = getStringValue(data.recipientUserId);
      if (!recipientUserId || recipientUserId !== user.id) {
        if (__DEV__) {
          console.log('DM notification ignored: recipient does not match signed-in account.');
        }
        setPendingSocialNotification(null);
        return;
      }
    }

    const notificationType = getStringValue(data.type);
    if (notificationType === 'group_message' || notificationType === 'group_invitation') {
      if (!GROUP_DM_ENABLED) {
        setPendingSocialNotification(null);
        return;
      }
      // Keep the response pending until authentication and the protected app
      // navigator have completed their initial restoration.
      if (!user?.id || !isInsideApp) {
        return;
      }
      const recipientUserId = getStringValue(data.recipientUserId);
      if (!recipientUserId || recipientUserId !== user.id) {
        if (__DEV__) {
          console.log('Group notification ignored: recipient does not match signed-in account.');
        }
        setPendingSocialNotification(null);
        return;
      }
    }

    setPendingSocialNotification(null);
    routeFromNotificationData(data, user?.id ?? null);
  }, [
    pendingSocialNotification,
    navigationState?.key,
    pathname,
    isAuthenticated,
    isInsideApp,
    user?.id,
  ]);

  useEffect(() => {
    if (
      !pendingCampaign ||
      processingCampaignRef.current ||
      !navigationState?.key ||
      pathname === '/' ||
      !isAuthenticated
    ) {
      return;
    }

    if (hasCollectionsLoadError) {
      Alert.alert(
        'Unable to Open Top 3',
        'Your collections could not be loaded. Please try again.'
      );
      setPendingCampaign(null);
      return;
    }

    if (!isCollectionsLoaded) {
      return;
    }

    const destinationInput = resolveNotificationCollection(
      pendingCampaign.destination,
      options,
      { includePodcasts: true }
    );

    if (!destinationInput) {
      if (
        pendingCampaign.destination.kind !== 'overall' &&
        pendingCampaign.destination.kind !== 'genre' &&
        options.length === 0
      ) {
        return;
      }

      Alert.alert(
        'Destination Unavailable',
        'This Top 3 destination is no longer available.'
      );
      setPendingCampaign(null);
      return;
    }

    processingCampaignRef.current = true;

    async function openCampaignCollection() {
      try {
        const resolvedDestinationInput = destinationInput;

        if (!resolvedDestinationInput) {
          throw new Error('Campaign destination is unavailable.');
        }

        function normalize(value?: string): string {
          const normalized = value?.trim().toLowerCase() ?? '';
          return normalized === 'general' ? '' : normalized;
        }

        const matchingCollections = lists.filter((list) => {
          if (
            normalize(list.category) !==
            normalize(resolvedDestinationInput.category)
          ) {
            return false;
          }

          if (
            resolvedDestinationInput.collectionOptionId &&
            list.collectionOptionId
          ) {
            return (
              normalize(list.collectionOptionId) ===
              normalize(resolvedDestinationInput.collectionOptionId)
            );
          }

          return (
            normalize(list.type) ===
              normalize(resolvedDestinationInput.type) &&
            normalize(list.topic) ===
              normalize(resolvedDestinationInput.topic)
          );
        });

        // Prefer an existing published or populated list.
        const existingCollection =
          matchingCollections.find(
            (list) => Boolean(list.publishedAt)
          ) ??
          matchingCollections.find(
            (list) => list.items.some((item) => item !== null)
          ) ??
          matchingCollections[0];

        let listId: string;

        if (existingCollection) {
          listId = existingCollection.id;
          selectList(listId);
        } else {
          listId = startListWithoutSaving(resolvedDestinationInput);
        }

        setPendingCampaign((current) =>
          current?.responseId === pendingCampaign!.responseId
            ? null
            : current
        );

        router.push({
          pathname: '/collection',
          params: { listId },
        });
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Unable to open campaign collection:',
            error
          );
        }

        setPendingCampaign(null);
        Alert.alert(
          'Unable to Open Top 3',
          'Please check your connection and try again.'
        );
      } finally {
        processingCampaignRef.current = false;
      }
    }

    void openCampaignCollection();
  }, [
    pendingCampaign,
    navigationState?.key,
    pathname,
    isAuthenticated,
    isCollectionsLoaded,
    hasCollectionsLoadError,
    options,
    lists,
    startListWithoutSaving,
    selectList,
  ]);

  return null;
}

/**
 * Covers the transparent Android system-navigation area in edge-to-edge mode.
 * Keep this separate from the floating Top 3 tab bar and its scroll effects.
 * On iOS we render nothing; native Modal windows have their own system bars.
 */
function AndroidSystemNavigationBackdrop({
  dark,
}: {
  dark: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const didShow = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const didHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      didShow.remove();
      didHide.remove();
    };
  }, []);

  if (
    Platform.OS !== 'android' ||
    keyboardVisible ||
    insets.bottom <= 0
  ) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: insets.bottom,
        backgroundColor: dark ? '#000000' : '#FFFFFF',
        zIndex: 1000,
        elevation: 1000,
      }}
    />
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initializeAnalytics();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AuthProvider>
          <OnboardingCollectionProvider>
            <ProfileProvider>
              <BlockProvider>
                <NotificationProvider>
                  <FollowProvider>
                    <LikeProvider>
                      <SavedItemsProvider>
                        <CommentProvider>
                          <CollectionOptionsProvider>
                            <Top3Provider>
                              <AudioPreviewProvider>
                              <TrailerPreviewProvider>
                                <BookPreviewProvider>
                                  <ThemeProvider
                                    value={
                                      colorScheme === 'dark'
                                        ? DarkTheme
                                        : DefaultTheme
                                    }>
                                    <FeedbackProvider>
                                      <NotificationResponseController />

                                      <Stack
                                        screenOptions={{
                                          headerShown: false,
                                        }}>
                                        <Stack.Screen name="index" />
                                        <Stack.Screen
                                          name="onboarding"
                                          options={{
                                            animation: 'none',
                                          }}
                                        />
                                        <Stack.Screen name="onboarding-create-topic" />
                                        <Stack.Screen name="onboarding-collection" />
                                        <Stack.Screen name="onboarding-search" />
                                        <Stack.Screen name="onboarding-published" />
                                        <Stack.Screen name="onboarding-overall-top3" />
                                        <Stack.Screen name="onboarding-taste-match" />
                                        <Stack.Screen name="onboarding-notifications" />
                                        <Stack.Screen name="(app)" />
                                      </Stack>

                                      <AudioPreviewSheet />
                                      <TrailerPreviewSheet />
                                      <BookPreviewSheet />
                                      <StatusBar style="auto" />
                                    </FeedbackProvider>
                                  </ThemeProvider>
                                </BookPreviewProvider>
                              </TrailerPreviewProvider>
                              </AudioPreviewProvider>
                            </Top3Provider>
                          </CollectionOptionsProvider>
                        </CommentProvider>
                      </SavedItemsProvider>
                    </LikeProvider>
                  </FollowProvider>
                </NotificationProvider>
              </BlockProvider>
            </ProfileProvider>
          </OnboardingCollectionProvider>
        </AuthProvider>
      </KeyboardProvider>
      {Platform.OS === 'android' ? (
        <AndroidSystemNavigationBackdrop dark={colorScheme === 'dark'} />
      ) : null}
    </GestureHandlerRootView>
  );
}
