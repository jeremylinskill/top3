import { ProfileProvider } from '@/context/profile-context';
import { Top3Provider } from '@/context/top3-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
        <ProfileProvider>
          <Top3Provider>
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
                <Stack.Screen name="(tabs)" />

                <Stack.Screen name="collections" />

                <Stack.Screen name="collection" />

                <Stack.Screen name="search" />

                <Stack.Screen name="edit-profile" />

                <Stack.Screen
                  name="modal"
                  options={{
                    presentation: 'modal',
                  }}
                />
              </Stack>

              <StatusBar style="auto" />
            </ThemeProvider>
          </Top3Provider>
        </ProfileProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}