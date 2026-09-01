import PrimaryButton from '@/components/primary-button';
import { TYPOGRAPHY } from '@/constants/typography';
import { useAuth } from '@/hooks/use-auth';
import {
    getExistingPushToken,
    registerForPushNotifications,
} from '@/lib/notifications';
import {
    deletePushToken,
    PushTokenPlatform,
    upsertPushToken,
} from '@/lib/supabase/push-tokens';
import {
    setPushNotificationsEnabled,
} from '@/services/onboarding-service';
import { router } from 'expo-router';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    Animated,
    Easing,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DemoNotification = {
  id: string;
  time: string;
  message: string;
};

const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 'follow',
    time: 'now',
    message: 'Janet started following you.',
  },
  {
    id: 'like',
    time: '2m ago',
    message: 'Calla liked your Top 3 Movies.',
  },
  {
    id: 'comment',
    time: '5m ago',
    message: 'Cole commented on your\nTop 3 Albums.',
  },
  {
    id: 'follow-john',
    time: '8m ago',
    message: 'John started following you.',
  },
];

export default function OnboardingNotificationsScreen() {
  const { height: windowHeight } =
    useWindowDimensions();

  const isCompactHeight =
    windowHeight <= 920;

  const { user } = useAuth();

  const [isEnabling, setIsEnabling] =
    useState(false);

  const [isSkipping, setIsSkipping] =
    useState(false);

  const contentOpacity =
    useRef(new Animated.Value(0)).current;

  const contentTranslateY =
    useRef(new Animated.Value(8)).current;

  const notificationOpacities =
    useRef(
      DEMO_NOTIFICATIONS.map(
        () => new Animated.Value(0)
      )
    ).current;

  const notificationTranslateYs =
    useRef(
      DEMO_NOTIFICATIONS.map(
        () => new Animated.Value(10)
      )
    ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(
        contentOpacity,
        {
          toValue: 1,
          duration: 420,
          easing:
            Easing.out(Easing.cubic),
          useNativeDriver: true,
        }
      ),
      Animated.timing(
        contentTranslateY,
        {
          toValue: 0,
          duration: 460,
          easing:
            Easing.out(Easing.cubic),
          useNativeDriver: true,
        }
      ),
    ]).start();

    const notificationAnimations =
      DEMO_NOTIFICATIONS.map(
        (_, index) =>
          Animated.parallel([
            Animated.timing(
              notificationOpacities[index],
              {
                toValue: 1,
                duration: 360,
                easing:
                  Easing.out(Easing.cubic),
                useNativeDriver: true,
              }
            ),
            Animated.timing(
              notificationTranslateYs[index],
              {
                toValue: 0,
                duration: 420,
                easing:
                  Easing.out(Easing.cubic),
                useNativeDriver: true,
              }
            ),
          ])
      );

    Animated.sequence([
      Animated.delay(260),
      Animated.stagger(
        190,
        notificationAnimations
      ),
    ]).start();
  }, [
    contentOpacity,
    contentTranslateY,
    notificationOpacities,
    notificationTranslateYs,
  ]);

  function enterApp() {
    router.replace('/(tabs)');
  }

  async function enableNotifications() {
    if (
      isEnabling ||
      isSkipping ||
      !user?.id ||
      (
        Platform.OS !== 'ios' &&
        Platform.OS !== 'android'
      )
    ) {
      enterApp();
      return;
    }

    const userId = user.id;
    const platform: PushTokenPlatform =
      Platform.OS;

    setIsEnabling(true);

    try {
      const result =
        await registerForPushNotifications();

      if (result.token) {
        await upsertPushToken({
          userId,
          expoPushToken: result.token,
          platform,
        });

        await setPushNotificationsEnabled(
          userId,
          true
        );
      } else {
        await setPushNotificationsEnabled(
          userId,
          false
        );
      }
    } catch (error) {
      console.error(
        'Failed to enable push notifications:',
        error
      );
    } finally {
      setIsEnabling(false);
      enterApp();
    }
  }

  async function skipNotifications() {
    if (
      isEnabling ||
      isSkipping ||
      !user?.id
    ) {
      enterApp();
      return;
    }

    const userId = user.id;

    setIsSkipping(true);

    try {
      const expoPushToken =
        await getExistingPushToken();

      if (expoPushToken) {
        await deletePushToken(
          expoPushToken
        );
      }

      await setPushNotificationsEnabled(
        userId,
        false
      );
    } catch (error) {
      console.error(
        'Failed to disable push notifications during onboarding:',
        error
      );
    } finally {
      setIsSkipping(false);
      enterApp();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.content,
          isCompactHeight &&
            styles.compactContent,
        ]}>
        <Animated.View
          style={[
            styles.mainContent,
            {
              opacity: contentOpacity,
              transform: [
                {
                  translateY:
                    contentTranslateY,
                },
              ],
            },
          ]}>
          <View
            style={[
              styles.headerBlock,
              isCompactHeight &&
                styles.compactHeaderBlock,
            ]}>
            <Text style={styles.title}>
              Stay in the loop.
            </Text>

            <Text style={styles.subtitle}>
              Get notified when someone likes or comments on your Top 3s, or starts following you.
            </Text>
          </View>

          <View
            style={[
              styles.notificationsStack,
              isCompactHeight &&
                styles.compactNotificationsStack,
            ]}>
            {DEMO_NOTIFICATIONS.map(
              (notification, index) => (
                <Animated.View
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    isCompactHeight &&
                      styles.compactNotificationCard,
                    {
                      opacity:
                        notificationOpacities[
                          index
                        ],
                      transform: [
                        {
                          translateY:
                            notificationTranslateYs[
                              index
                            ],
                        },
                      ],
                    },
                  ]}>
                  <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.appIcon}
                    resizeMode="cover"
                  />

                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.appName}>
                        Top 3
                      </Text>

                      <Text style={styles.notificationTime}>
                        {notification.time}
                      </Text>
                    </View>

                    <Text
                      style={styles.notificationMessage}
                      numberOfLines={2}>
                      {notification.message}
                    </Text>
                  </View>
                </Animated.View>
              )
            )}
          </View>
        </Animated.View>
      </View>

      <View style={styles.bottomBar}>
        <PrimaryButton
          title={
            isEnabling
              ? 'Turning on notifications...'
              : 'Turn on notifications'
          }
          onPress={() => {
            void enableNotifications();
          }}
          disabled={
            isEnabling ||
            isSkipping
          }
        />

        <Pressable
          style={styles.notNowButton}
          onPress={() => {
            void skipNotifications();
          }}
          disabled={
            isEnabling ||
            isSkipping
          }
          accessibilityRole="button"
          accessibilityLabel="Not now">
          <Text style={styles.notNowText}>
            Not now
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 20,
  },

  compactContent: {
    paddingTop: 42,
    paddingBottom: 12,
  },

  mainContent: {
    width: '100%',
  },

  headerBlock: {
    minHeight: 104,
  },

  compactHeaderBlock: {
    minHeight: 92,
  },

  title: {
    ...TYPOGRAPHY.pageTitle,
    paddingHorizontal: 8,
    textAlign: 'center',
  },

  subtitle: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 12,
    paddingHorizontal: 14,
    color: '#777777',
    textAlign: 'center',
  },

  notificationsStack: {
    marginTop: 20,
    gap: 14,
  },

  compactNotificationsStack: {
    marginTop: 66,
    gap: 8,
  },

  notificationCard: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.10)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },

  compactNotificationCard: {
    minHeight: 76,
    paddingVertical: 10,
  },

  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 11,
    flexShrink: 0,
  },

  notificationContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },

  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },

  appName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#222222',
  },

  notificationTime: {
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#8A8A8E',
  },

  notificationMessage: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
    color: '#222222',
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },

  notNowButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  notNowText: {
    ...TYPOGRAPHY.action,
  },
});
