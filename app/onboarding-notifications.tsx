import PrimaryButton from '@/components/primary-button';
import { TYPOGRAPHY } from '@/constants/typography';
import { useAuth } from '@/hooks/use-auth';
import {
    registerForPushNotifications,
} from '@/lib/notifications';
import {
    PushTokenPlatform,
    upsertPushToken,
} from '@/lib/supabase/push-tokens';
import { router } from 'expo-router';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingNotificationsScreen() {
  const { user } = useAuth();

  const [isEnabling, setIsEnabling] =
    useState(false);

  const contentOpacity =
    useRef(new Animated.Value(0)).current;

  const contentTranslateY =
    useRef(new Animated.Value(8)).current;

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
  }, [
    contentOpacity,
    contentTranslateY,
  ]);

  function enterApp() {
    router.replace('/(tabs)');
  }

  async function enableNotifications() {
    if (
      isEnabling ||
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.explainer,
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
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>
              🔔
            </Text>
          </View>

          <Text style={styles.title}>
            Stay in the loop.
          </Text>

          <Text style={styles.subtitle}>
            Get notified when someone likes
            or comments on your Top 3s, or
            starts following you.
          </Text>
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
          disabled={isEnabling}
        />

        <Pressable
          style={styles.notNowButton}
          onPress={enterApp}
          disabled={isEnabling}
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
    justifyContent: 'center',
  },

  explainer: {
    alignItems: 'center',
    paddingBottom: 36,
  },

  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  icon: {
    fontSize: 42,
    lineHeight: 50,
  },

  title: {
    ...TYPOGRAPHY.pageTitle,
    paddingHorizontal: 8,
    textAlign: 'center',
  },

  subtitle: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 12,
    maxWidth: 330,
    color: '#777777',
    textAlign: 'center',
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