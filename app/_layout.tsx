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
import { AuthProvider } from '@/providers/auth-provider';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';


export const unstable_settings = {
  anchor: '(tabs)',
};


export default function RootLayout() {
  const colorScheme = useColorScheme();


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AuthProvider>
          <AuthGate>
            <OnboardingCollectionProvider>
              <ProfileProvider>
                <NotificationProvider>
                  <FollowProvider>
                    <BlockProvider>
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
                                <Stack
                                  screenOptions={{
                                    headerShown: false,
                                  }}>
                                  <Stack.Screen name="index" />


                                  <Stack.Screen name="onboarding" />


                                  <Stack.Screen name="onboarding-published" />


                                  <Stack.Screen name="onboarding-overall-top3" />


                                  <Stack.Screen name="onboarding-taste-match" />


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
                    </BlockProvider>
                  </FollowProvider>
                </NotificationProvider>
              </ProfileProvider>
            </OnboardingCollectionProvider>
          </AuthGate>
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}