import { AuthGate } from '@/components/auth-gate';
import { AudioPreviewProvider } from '@/context/audio-preview-context';
import { BlockProvider } from '@/context/block-context';
import { CommentProvider } from '@/context/comment-context';
import { FollowProvider } from '@/context/follow-context';
import { LikeProvider } from '@/context/like-context';
import { NotificationProvider } from '@/context/notification-context';
import { OnboardingCollectionProvider } from '@/context/onboarding-collection-context';
import { ProfileProvider } from '@/context/profile-context';
import { Top3Provider } from '@/context/top3-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeAnalytics } from '@/lib/analytics';
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
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  useEffect,
  useRef,
} from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

type NotificationRouteData = {
  type?: unknown;
  actorUserId?: unknown;
  collectionId?: unknown;
};

function getStringValue(
  value: unknown
): string | null {
  return typeof value === 'string' &&
    value.trim()
    ? value.trim()
    : null;
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
    (type === 'like' ||
      type === 'comment') &&
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
    type === 'follow' &&
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

      routeFromNotificationData(
        response.notification.request.content
          .data as NotificationRouteData
      );
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
        console.error(
          'Failed to read last notification response:',
          error
        );
      });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

function StartupSplashController() {
  const pathname = usePathname();

  const hasHiddenSplash =
    useRef(false);

  useEffect(() => {
    if (
      hasHiddenSplash.current ||
      pathname === '/' ||
      pathname === '/onboarding'
    ) {
      return;
    }

    hasHiddenSplash.current = true;

    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

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
          <AuthGate>
            <OnboardingCollectionProvider>
              <ProfileProvider>
                <BlockProvider>
                  <NotificationProvider>
                    <FollowProvider>
                      <LikeProvider>
                        <CommentProvider>
                          <Top3Provider>
                            <AudioPreviewProvider>
                              <ThemeProvider
                                value={
                                  colorScheme === 'dark'
                                    ? DarkTheme
                                    : DefaultTheme
                                }>
                                <StartupSplashController />
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
                                  <Stack.Screen name="onboarding-published" />
                                  <Stack.Screen name="onboarding-overall-top3" />
                                  <Stack.Screen name="onboarding-taste-match" />
                                  <Stack.Screen name="onboarding-notifications" />
                                  <Stack.Screen name="(tabs)" />
                                  <Stack.Screen name="collections" />
                                  <Stack.Screen name="collection" />
                                  <Stack.Screen name="search" />
                                  <Stack.Screen name="edit-profile" />
                                  <Stack.Screen name="notifications" />
                                  <Stack.Screen name="public-profile" />
                                  <Stack.Screen name="published-top3" />
                                  <Stack.Screen name="community-top3" />
                                  <Stack.Screen name="overall-top3-topics" />
                                  <Stack.Screen
                                    name="modal"
                                    options={{
                                      presentation: 'modal',
                                    }}
                                  />
                                </Stack>

                                <StatusBar style="auto" />
                              </ThemeProvider>
                            </AudioPreviewProvider>
                          </Top3Provider>
                        </CommentProvider>
                      </LikeProvider>
                    </FollowProvider>
                  </NotificationProvider>
                </BlockProvider>
              </ProfileProvider>
            </OnboardingCollectionProvider>
          </AuthGate>
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}