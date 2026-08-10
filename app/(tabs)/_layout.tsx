import { useNotifications } from '@/context/notification-context';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

const TAB_ICON_SIZE = 29;

export default function TabLayout() {
  const { unreadCount } = useNotifications();

  const notificationBadge =
    unreadCount === 0
      ? undefined
      : unreadCount > 9
        ? '9+'
        : unreadCount;

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarActiveTintColor: '#222222',
        tabBarInactiveTintColor: '#8E8E93',

        tabBarStyle: {
          backgroundColor: '#FAFAFA',
          borderTopWidth: 1,
          borderTopColor: '#EAEAEA',
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: {
            width: 0,
            height: 0,
          },
          height: 72,
        },

        tabBarItemStyle: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 6,
},
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
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
          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'compass'
                  : 'compass-outline'
              }
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
          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'add-circle'
                  : 'add-circle-outline'
              }
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
          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'notifications'
                  : 'notifications-outline'
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
          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'person'
                  : 'person-outline'
              }
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}