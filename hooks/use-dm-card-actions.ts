import { useBlock } from '@/context/block-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useAuth } from '@/hooks/use-auth';
import { DM_NAV_ENABLED } from '@/lib/dm-availability';
import {
  listDmShareRecipientIds,
  openDmConversation,
} from '@/lib/supabase/direct-messages';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

// One eligible-recipient lookup per focused screen, not one per visible card.
// Server-side dm_can_message checks mutual follows and both block directions.
// A stale eligibility result is harmless: opening a conversation is guarded
// again by dm_create_conversation on the server.
export function useDmCardActions() {
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const { followedUserIds } = useFollow();
  const { blockedUserIds } = useBlock();
  const [eligibleRecipients, setEligibleRecipients] = useState<Set<string>>(
    () => new Set()
  );
  const openingRef = useRef(false);

  // Refresh after follow/block changes and when the user returns to a screen.
  const followKey = followedUserIds.join(',');
  const blockKey = blockedUserIds.join(',');
  useFocusEffect(useCallback(() => {
    let active = true;
    setEligibleRecipients(new Set());
    if (!DM_NAV_ENABLED || !isAuthenticated || !profile.id) {
      return () => { active = false; };
    }
    void listDmShareRecipientIds()
      .then(ids => {
        if (active) setEligibleRecipients(new Set(ids));
      })
      .catch(error => {
        if (active) {
          setEligibleRecipients(new Set());
          if (__DEV__) console.warn('Unable to load eligible DM card recipients:', error);
        }
      });
    return () => {
      active = false;
      setEligibleRecipients(new Set());
    };
  }, [isAuthenticated, profile.id, followKey, blockKey]));

  const canMessage = (authorId: string) =>
    DM_NAV_ENABLED &&
    isAuthenticated &&
    Boolean(profile.id) &&
    authorId !== profile.id &&
    !blockedUserIds.includes(authorId) &&
    eligibleRecipients.has(authorId);

  const openMessage = async (authorId: string) => {
    if (!canMessage(authorId) || openingRef.current) return;
    openingRef.current = true;
    try {
      const conversationId = await openDmConversation(authorId);
      router.push({ pathname: '/dm-conversation', params: { conversationId } });
    } catch (error) {
      Alert.alert(
        'Unable to start conversation',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      openingRef.current = false;
    }
  };

  return { canMessage, openMessage };
}
