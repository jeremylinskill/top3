import { supabase } from '@/lib/supabase';

type PostgresChangesSubscriptionInput = {
  channelName: string;
  table: string;
  filter?: string;
  onChange: () => void | Promise<void>;
};

export function subscribeToTableChanges({
  channelName,
  table,
  filter,
  onChange,
}: PostgresChangesSubscriptionInput) {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      () => {
        void onChange();
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