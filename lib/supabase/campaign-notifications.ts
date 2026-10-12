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
