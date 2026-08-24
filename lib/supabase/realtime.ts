import { supabase } from '@/lib/supabase';

export type PostgresChangesPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

type PostgresChangesSubscriptionInput = {
  channelName: string;
  table: string;
  filter?: string;
  onChange: (
    payload: PostgresChangesPayload
  ) => void | Promise<void>;
};

export function subscribeToTableChanges({
  channelName,
  table,
  filter,
  onChange,
}: PostgresChangesSubscriptionInput) {
  const uniqueChannelName =
    `${channelName}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const channel = supabase
    .channel(uniqueChannelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        void onChange(
          payload as PostgresChangesPayload
        );
      }
    )
    .subscribe((status, error) => {
      switch (status) {
        case 'SUBSCRIBED':
          return;

        case 'CHANNEL_ERROR':
          console.warn(
            `Realtime subscription error for ${table}:`,
            error
          );
          return;

        case 'TIMED_OUT':
          console.warn(
            `Realtime subscription timed out for ${table}.`
          );
          return;

        default:
          return;
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}