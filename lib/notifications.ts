import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PushRegistrationResult = {
  token: string | null;
  permissionStatus: Notifications.PermissionStatus;
};

function getProjectId(): string {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      'Unable to determine the EAS project ID for push notifications.'
    );
  }

  return projectId;
}

async function configureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    'default',
    {
      name: 'Default',
      importance:
        Notifications.AndroidImportance.DEFAULT,
    }
  );
}

async function getExpoPushToken(): Promise<string> {
  const projectId = getProjectId();

  const pushToken =
    await Notifications.getExpoPushTokenAsync({
      projectId,
    });

  return pushToken.data;
}

export async function getExistingPushToken(): Promise<string | null> {
  await configureAndroidNotificationChannel();

  const permissions =
    await Notifications.getPermissionsAsync();

  if (
    permissions.status !==
    Notifications.PermissionStatus.GRANTED
  ) {
    return null;
  }

  return getExpoPushToken();
}

export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  await configureAndroidNotificationChannel();

  const existingPermissions =
    await Notifications.getPermissionsAsync();

  let permissionStatus =
    existingPermissions.status;

  if (
    permissionStatus !==
    Notifications.PermissionStatus.GRANTED
  ) {
    const requestedPermissions =
      await Notifications.requestPermissionsAsync();

    permissionStatus =
      requestedPermissions.status;
  }

  if (
    permissionStatus !==
    Notifications.PermissionStatus.GRANTED
  ) {
    return {
      token: null,
      permissionStatus,
    };
  }

  return {
    token: await getExpoPushToken(),
    permissionStatus,
  };
}