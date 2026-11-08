import { useAuth } from '@/hooks/use-auth';
import {
  getMyDmReadStates,
  hasUnreadDmMessages,
  listDmConversations,
} from '@/lib/supabase/direct-messages';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AppState } from 'react-native';

// One subscription owner lives in the main tab layout; all tab headers read
// its boolean state through context rather than subscribing independently.
export const DmUnreadContext = createContext(false);

export function useDmUnreadStatus(): boolean {
  return useContext(DmUnreadContext);
}

// The tab headers need only a boolean. No message bodies are included in
// Realtime events: conversation revisions and read-state changes prompt a
// participant-protected read using the same rules as the Messages inbox.
export function useDmUnread(enabled: boolean): boolean {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [hasUnread, setHasUnread] = useState(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    if (!enabled || !userId) {
      setHasUnread(false);
      return;
    }

    try {
      const conversations = await listDmConversations(userId, 100);
      const readStates = await getMyDmReadStates(
        userId,
        conversations.map((conversation) => conversation.id)
      );
      const readsById = new Map(
        readStates.map((read) => [read.conversation_id, read.last_read_at])
      );
      const candidates = conversations.filter((conversation) => {
        if (!conversation.last_message_at) return false;
        const readAt = readsById.get(conversation.id);
        return !readAt ||
          new Date(conversation.last_message_at).getTime() > new Date(readAt).getTime();
      });

      // Only inspect candidate conversations. Check four at a time to avoid
      // issuing a burst of requests for accounts with many conversations.
      let foundUnread = false;
      for (let index = 0; index < candidates.length; index += 4) {
        const batch = candidates.slice(index, index + 4);
        const unreadFlags = await Promise.all(
          batch.map((conversation) => hasUnreadDmMessages(
            conversation.id,
            userId,
            readsById.get(conversation.id) ?? null
          ))
        );
        if (current !== generation.current) return;
        foundUnread = unreadFlags.some(Boolean);
        if (foundUnread) break;
      }
      if (current === generation.current) setHasUnread(foundUnread);
    } catch (error) {
      // Keep the previously known indicator when the network is unavailable.
      if (current === generation.current && __DEV__) {
        console.warn('Unable to refresh Direct Message unread status:', error);
      }
    }
  }, [enabled, userId]);

  useFocusEffect(useCallback(() => {
    if (!enabled || !userId) {
      setHasUnread(false);
      return;
    }
    let active = true;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (!active || AppState.currentState !== 'active') return;
      if (pending !== null) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        if (active) void refresh();
      }, 200);
    };

    const unsubscribeConversations = subscribeToTableChanges({
      channelName: `dm-home-conversations-${userId}`,
      table: 'dm_conversations',
      events: ['INSERT', 'UPDATE'],
      onChange: scheduleRefresh,
      onSubscribed: scheduleRefresh,
    });
    const unsubscribeReadStates = subscribeToTableChanges({
      channelName: `dm-home-read-states-${userId}`,
      table: 'dm_read_states',
      filter: `user_id=eq.${userId}`,
      events: ['INSERT', 'UPDATE'],
      onChange: scheduleRefresh,
      onSubscribed: scheduleRefresh,
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleRefresh();
    });
    void refresh();

    return () => {
      active = false;
      if (pending !== null) clearTimeout(pending);
      generation.current += 1;
      unsubscribeConversations();
      unsubscribeReadStates();
      appState.remove();
    };
  }, [enabled, userId, refresh]));

  return enabled && Boolean(userId) && hasUnread;
}
