import { supabase } from '@/lib/supabase';

export type PushTokenPlatform =
  | 'ios'
  | 'android';

export async function upsertPushToken({
  userId,
  expoPushToken,
  platform,
}: {
  userId: string;
  expoPushToken: string;
  platform: PushTokenPlatform;
}): Promise<void> {
  if (!userId || !expoPushToken) {
    return;
  }

  const { error } = await supabase.rpc(
    'register_push_token',
    {
      p_expo_push_token:
        expoPushToken,
      p_platform: platform,
    }
  );

  if (error) {
    throw error;
  }
}

export async function isPushTokenRegistered(
  expoPushToken: string
): Promise<boolean> {
  if (!expoPushToken) {
    return false;
  }

  const { data, error } = await supabase
    .from('push_tokens')
    .select('id')
    .eq(
      'expo_push_token',
      expoPushToken
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function deletePushToken(
  expoPushToken: string
): Promise<void> {
  if (!expoPushToken) {
    return;
  }

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq(
      'expo_push_token',
      expoPushToken
    );

  if (error) {
    throw error;
  }
}