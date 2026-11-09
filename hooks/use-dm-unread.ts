import { useAuth } from '@/hooks/use-auth';
import { GROUP_DM_ENABLED } from '@/lib/dm-availability';
import {
  getMyDmReadStates,
  hasUnreadDmMessages,
  listDmConversations,
} from '@/lib/supabase/direct-messages';
import {
  getMyGroupReadStates,
  hasUnreadGroupMessages,
  listGroupConversations,
  listMyGroupMemberships,
} from '@/lib/supabase/group-messages';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AppState } from 'react-native';

// One subscription owner lives in the main tab layout; all tab headers read
// its unread count through context rather than subscribing independently.
export const DmUnreadContext = createContext(0);

export function useDmUnreadStatus(): number {
  return useContext(DmUnreadContext);
}

// Headers need a count of conversations or invitations requiring attention.
// No message bodies are included in
// Realtime events: conversation revisions and read-state changes prompt a
// participant-protected read using the same rules as the Messages inbox.
export function useDmUnread(enabled: boolean): number {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [unreadCount, setUnreadCount] = useState(0);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    if (!enabled || !userId) {
      setUnreadCount(0);
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

      // Count each conversation once, not each individual message. Limit
      // the work to the first 10 conversations needing attention because
      // the badge shows 9+ beyond that point.
      let dmCount = 0;
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
        dmCount += unreadFlags.filter(Boolean).length;
        if (dmCount >= 10) break;
      }

      // Pending invitations count as one each. Accepted groups count once
      // only when they contain an unread incoming message. Never query group
      // tables when the feature is disabled (including Production).
      let groupCount = 0;
      if (GROUP_DM_ENABLED && dmCount < 10) {
        const memberships = await listMyGroupMemberships(userId);
        if (current !== generation.current) return;

        groupCount = memberships.filter(
          (member) => member.status === 'invited'
        ).length;

        if (dmCount + groupCount < 10) {
          const acceptedIds = memberships
            .filter((member) => member.status === 'accepted')
            .map((member) => member.group_id);

          if (acceptedIds.length) {
            const groups = await listGroupConversations(acceptedIds);
            if (current !== generation.current) return;
            const unreadCandidates = groups.filter(
              (group) => Boolean(group.last_message_at)
            );
            if (unreadCandidates.length) {
              const reads = await getMyGroupReadStates(userId, acceptedIds);
              if (current !== generation.current) return;
              const readById = new Map(
                reads.map((read) => [read.group_id, read.last_read_at])
              );
              for (let index = 0; index < unreadCandidates.length; index += 4) {
                const batch = unreadCandidates.slice(index, index + 4);
                const unreadFlags = await Promise.all(
                  batch.map((group) => hasUnreadGroupMessages(
                    group.id,
                    userId,
                    readById.get(group.id) ?? null
                  ))
                );
                if (current !== generation.current) return;
                groupCount += unreadFlags.filter(Boolean).length;
                if (dmCount + groupCount >= 10) break;
              }
            }
          }
        }
      }
      if (current === generation.current) {
        setUnreadCount(Math.min(10, dmCount + groupCount));
      }
    } catch (error) {
      // Keep the previously known indicator when the network is unavailable.
      if (current === generation.current && __DEV__) {
        console.warn('Unable to refresh Direct Message unread status:', error);
      }
    }
  }, [enabled, userId]);

  useFocusEffect(useCallback(() => {
    if (!enabled || !userId) {
      setUnreadCount(0);
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
    // Group conversations publish only metadata; user-specific read-state
    // changes likewise trigger a participant-protected unread check.
    const unsubscribeGroupConversations = GROUP_DM_ENABLED
      ? subscribeToTableChanges({
          channelName: `dm-home-group-conversations-${userId}`,
          table: 'dm_group_conversations',
          events: ['INSERT', 'UPDATE'],
          onChange: scheduleRefresh,
          onSubscribed: scheduleRefresh,
        })
      : () => {};
    const unsubscribeGroupReadStates = GROUP_DM_ENABLED
      ? subscribeToTableChanges({
          channelName: `dm-home-group-read-states-${userId}`,
          table: 'dm_group_read_states',
          filter: `user_id=eq.${userId}`,
          events: ['INSERT', 'UPDATE'],
          onChange: scheduleRefresh,
          onSubscribed: scheduleRefresh,
        })
      : () => {};

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
      unsubscribeGroupConversations();
      unsubscribeGroupReadStates();
      appState.remove();
    };
  }, [enabled, userId, refresh]));

  return enabled && Boolean(userId) ? unreadCount : 0;
}
