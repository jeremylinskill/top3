import UserAvatar from '@/components/user-avatar';
import { useNotifications } from '@/context/notification-context';
import { useProfile } from '@/context/profile-context';
import {
  FLOATING_TAB_BAR_BOTTOM_SPACING,
  FLOATING_TAB_BAR_HEIGHT,
  TabBarScrollProvider,
  useTabBarScroll,
} from '@/context/tab-bar-scroll-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomTabBar,
  type BottomTabBarButtonProps,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICON_SIZE = 29;
const TAB_BAR_HORIZONTAL_MARGIN = 16;
const TAB_BAR_COMPACT_SCALE = 0.9;
const AVATAR_SIZE = 29;
const AVATAR_CONTAINER_SIZE = 38;
const ACTIVE_HIGHLIGHT_WIDTH = 54;
const ACTIVE_HIGHLIGHT_HEIGHT = 44;

function withOpacity(color: string, alpha: number) {
  const hex = color.trim().replace(/^#/, '');

  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const [r, g, b] = hex.split('').map((part) =>
      parseInt(part + part, 16)
    );
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Preserve any non-hex colour without altering its meaning.
  return color;
}

function CenteredTabButton(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      style={[
        props.style,
        { alignItems: 'center', justifyContent: 'center' },
      ]}
    />
  );
}

function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const { compact, expand } = useTabBarScroll();
  const scale = useRef(new Animated.Value(1)).current;
  const selectedIndex = useRef(
    new Animated.Value(props.state.index)
  ).current;
  const [barWidth, setBarWidth] = useState(0);

  const tabCount = props.state.routes.length;
  const tabWidth = tabCount > 0 ? barWidth / tabCount : 0;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: compact ? TAB_BAR_COMPACT_SCALE : 1,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [compact, scale]);

  useEffect(() => {
    Animated.spring(selectedIndex, {
      toValue: props.state.index,
      tension: 90,
      friction: 12,
      useNativeDriver: true,
    }).start();

    // Expanding the bar after a tab change also resets
    // scroll state for the next screen.
    expand();
  }, [props.state.index, expand, selectedIndex]);

  return (
    <>
      {/* Opaque Android system-button area; floating pill stays translucent. */}
      {Platform.OS === 'android' && insets.bottom > 0 ? (
        <View
          testID="AndroidSystemNavigationBackdrop"
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: insets.bottom,
            backgroundColor: colors.background,
          }}
        />
      ) : null}
      <Animated.View
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (Math.abs(width - barWidth) > 0.5) {
          setBarWidth(width);
        }
      }}
      style={{
        position: 'absolute',
        left: TAB_BAR_HORIZONTAL_MARGIN,
        right: TAB_BAR_HORIZONTAL_MARGIN,
        bottom: insets.bottom + FLOATING_TAB_BAR_BOTTOM_SPACING,
        height: FLOATING_TAB_BAR_HEIGHT,
        borderRadius: FLOATING_TAB_BAR_HEIGHT / 2,
        backgroundColor: withOpacity(colors.background, 0.92),
        shadowColor: '#000000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
        transform: [{ scaleX: scale }, { scaleY: scale }],
      }}>
      {barWidth > 0 && tabCount > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top:
              (FLOATING_TAB_BAR_HEIGHT - ACTIVE_HIGHLIGHT_HEIGHT) / 2,
            left: (tabWidth - ACTIVE_HIGHLIGHT_WIDTH) / 2,
            width: ACTIVE_HIGHLIGHT_WIDTH,
            height: ACTIVE_HIGHLIGHT_HEIGHT,
            borderRadius: ACTIVE_HIGHLIGHT_HEIGHT / 2,
            backgroundColor: withOpacity(colors.text, 0.09),
            transform: [
              {
                translateX: Animated.multiply(selectedIndex, tabWidth),
              },
            ],
          }}
        />
      )}
      <BottomTabBar
        {...props}
        // The outer pill supplies the translucent background.
        // Keep the underlying tab bar transparent and borderless.
        insets={{ ...props.insets, bottom: 0 }}
      />
      </Animated.View>
    </>
  );
}

function TabNavigator() {
  const colors = useAppColors();
  const { unreadCount } = useNotifications();
  const { profile } = useProfile();

  const avatarUrl = profile?.avatarUrl;
  const notificationBadge =
    unreadCount === 0
      ? undefined
      : unreadCount > 9
        ? '9+'
        : unreadCount;

  return (
    <Tabs
      initialRouteName="feed"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.tertiaryText,
        tabBarButton: (props) => <CenteredTabButton {...props} />,
        tabBarStyle: {
          backgroundColor: 'transparent',
          height: FLOATING_TAB_BAR_HEIGHT,
          borderRadius: FLOATING_TAB_BAR_HEIGHT / 2,
          borderWidth: 0,
          borderTopWidth: 0,
          paddingTop: 0,
          paddingBottom: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}>
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="top3"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarBadge: notificationBadge,
          tabBarBadgeStyle: {
            fontSize: 10,
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused ? 'notifications' : 'notifications-outline'
              }
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => {
            if (!avatarUrl) {
              return (
                <Ionicons
                  name={focused ? 'person' : 'person-outline'}
                  size={TAB_ICON_SIZE}
                  color={color}
                />
              );
            }

            return (
              <View
                style={{
                  width: AVATAR_CONTAINER_SIZE,
                  height: AVATAR_CONTAINER_SIZE,
                  borderRadius: AVATAR_CONTAINER_SIZE / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: focused ? 2 : 0,
                  borderColor: colors.text,
                }}>
                <UserAvatar
                  displayName="Profile"
                  avatarUrl={avatarUrl}
                  size={AVATAR_SIZE}
                />
              </View>
            );
          },
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <TabBarScrollProvider>
      <TabNavigator />
    </TabBarScrollProvider>
  );
}
