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
      if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT'
      ) {
        console.error(
          `Realtime subscription failed for ${table}:`,
          error
        );
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}