import { supabase } from '@/lib/supabase';
import type { NotificationDestination } from '@/types/notification-destination';
import { FunctionsHttpError } from '@supabase/supabase-js';

type CampaignTestInput = {
  title: string;
  message: string;
  destination: NotificationDestination;
  expoPushToken: string;
};

type CampaignTestResponse = {
  success?: boolean;
  action?: string;
  accepted?: number;
  historyRecorded?: boolean;
  error?: string;
};

export async function sendCampaignTestNotification({
  title,
  message,
  destination,
  expoPushToken,
}: CampaignTestInput): Promise<{ historyRecorded: boolean }> {
  const { data, error } =
    await supabase.functions.invoke<CampaignTestResponse>(
      'send-campaign-notification',
      {
        body: {
          action: 'test',
          title,
          message,
          destination,
          expoPushToken,
        },
      }
    );

  if (error) {
    let reason: string |null = null;

    if (error instanceof FunctionsHttpError) {
      try {
        const response: unknown =
          await error.context.clone().json();

        if (
          response !== null &&
          typeof response === 'object' &&
          'error' in response &&
          typeof response.error === 'string'
        ) {
          reason = response.error;
        }
      } catch {
        // Use the fallback error below.
      }
    }

    throw new Error(
      reason ?? 'Unable to send test notification.'
    );
  }

  if (
    data?.success !== true ||
    data.action !== 'test' ||
    data.accepted !== 1
  ) {
    throw new Error(
      data?.error ??
        'Expo did not accept the test notification.'
    );
  }

  return {
    historyRecorded: data.historyRecorded === true,
  };
}

// Broadcasts require a server-verified administrator, an audience
// preview, and a single-use confirmation ID. Never send tokens from
// the client: the Edge Function loads them with its privileged client.
export type BroadcastPreview = {
  requestId: string;
  deviceCount: number;
  userCount: number;
};

type BroadcastInput = {
  title: string;
  message: string;
  destination: NotificationDestination;
};

type BroadcastResponse = {
  success?: boolean;
  action?: string;
  requestId?: string;
  deviceCount?: number;
  userCount?: number;
  targetCount?: number;
  accepted?: number;
  failed?: number;
  historyRecorded?: boolean;
  error?: string;
};

async function invokeBroadcast(
  body: Record<string, unknown>
): Promise<BroadcastResponse> {
  const { data, error } = await supabase.functions.invoke<BroadcastResponse>(
    'send-broadcast-notification',
    { body }
  );
  if (error) {
    let reason: string | null = null;
    if (error instanceof FunctionsHttpError) {
      try {
        const response: unknown = await error.context.clone().json();
        if (response !== null && typeof response === 'object' &&
            'error' in response && typeof response.error === 'string') {
          reason = response.error;
        }
      } catch { /* Use fallback. */ }
    }
    throw new Error(reason ?? 'Unable to contact broadcast service.');
  }
  if (data?.success !== true) {
    throw new Error(data?.error ?? 'Broadcast request failed.');
  }
  return data;
}

export async function previewNotificationBroadcast(
  input: BroadcastInput
): Promise<BroadcastPreview> {
  const result = await invokeBroadcast({ action: 'preview-all', ...input });
  if (result.action !== 'preview-all' ||
      typeof result.requestId !== 'string' ||
      typeof result.deviceCount !== 'number' ||
      typeof result.userCount !== 'number') {
    throw new Error('Unable to confirm the broadcast audience.');
  }
  return {
    requestId: result.requestId,
    deviceCount: result.deviceCount,
    userCount: result.userCount,
  };
}

export async function sendNotificationBroadcast(
  input: BroadcastInput & {
    requestId: string;
    expectedDeviceCount: number;
  }
): Promise<{
  targetCount: number;
  accepted: number;
  failed: number;
  historyRecorded: boolean;
}> {
  const result = await invokeBroadcast({
    action: 'send-all',
    ...input,
  });
  if (result.action !== 'send-all' ||
      typeof result.targetCount !== 'number' ||
      typeof result.accepted !== 'number' ||
      typeof result.failed !== 'number') {
    throw new Error('Broadcast response was not confirmed. Check History before trying again.');
  }
  return {
    targetCount: result.targetCount,
    accepted: result.accepted,
    failed: result.failed,
    historyRecorded: result.historyRecorded === true,
  };
}
