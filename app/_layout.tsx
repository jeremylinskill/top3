import AudioPreviewSheet from '@/components/audio-preview-sheet';
import BookPreviewSheet from '@/components/book-preview-sheet';
import TrailerPreviewSheet from '@/components/trailer-preview-sheet';
import { AudioPreviewProvider } from '@/context/audio-preview-context';
import { BlockProvider } from '@/context/block-context';
import { BookPreviewProvider } from '@/context/book-preview-context';
import { CollectionOptionsProvider, useCollectionOptions } from '@/context/collection-options-context';
import { CommentProvider } from '@/context/comment-context';
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
  usePathname,
  useRootNavigationState,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

// Display push notifications while Top 3 is open.
// Device notification permissions still apply.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type NotificationRouteData = {
  type?: unknown;
  actorUserId?: unknown;
  collectionId?: unknown;
  destination?: unknown;
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
        category.id === categoryId &&
        category.id !== 'podcasts'
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
    (kind === 'type' || kind === 'theme') &&
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
  data: NotificationRouteData
) {
  const type =
    getStringValue(data.type);

  const collectionId =
    getStringValue(data.collectionId);

  const actorUserId =
    getStringValue(data.actorUserId);




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

  const { isAuthenticated } = useAuth();
  const navigationState = useRootNavigationState();
  const pathname = usePathname();
  const { options } = useCollectionOptions();
  const {
    lists,
    isCollectionsLoaded,
    hasCollectionsLoadError,
    createList,
    selectList,
  } = useTop3();

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

      routeFromNotificationData(data);
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
      options
    );

    if (!destinationInput) {
      if (
        pendingCampaign.destination.kind !== 'overall' &&
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
          listId = await createList(resolvedDestinationInput);
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
    createList,
    selectList,
  ]);

  return null;
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
    </GestureHandlerRootView>
  );
}
