import { useAuth } from '@/hooks/use-auth';
import { useDmUnreadStatus } from '@/hooks/use-dm-unread';
import { DM_NAV_ENABLED } from '@/lib/dm-availability';
import { router } from 'expo-router';

// Use the same action, accessibility label and unread status across all five
// main tabs. The one Realtime-backed unread subscription lives in the tab layout.
export function useDmHeaderAction() {
  const { isAuthenticated } = useAuth();
  const hasUnread = useDmUnreadStatus();

  if (!DM_NAV_ENABLED || !isAuthenticated) return {};

  return {
    rightIconName: 'chatbubbles-outline' as const,
    onRightPress: () => router.push('/messages'),
    rightAccessibilityLabel: hasUnread
      ? 'Open Messages, unread messages'
      : 'Open Messages',
    rightUnreadDot: hasUnread,
  };
}
