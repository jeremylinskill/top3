import { supabase } from '@/lib/supabase';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'follow_request_accepted';

export type Notification = {
  id: string;
  recipientUserId: string;
  actorUserId: string;
  type: NotificationType;
  collectionId?: string;
  commentId?: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string;
  type: NotificationType;
  collection_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
};

function mapNotificationRow(
  row: NotificationRow
): Notification {
  return {
    id: row.id,
    recipientUserId:
      row.recipient_user_id,
    actorUserId: row.actor_user_id,
    type: row.type,
    collectionId:
      row.collection_id ?? undefined,
    commentId:
      row.comment_id ?? undefined,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function getNotifications(
  userId: string
): Promise<Notification[]> {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .select(
      `
        id,
        recipient_user_id,
        actor_user_id,
        type,
        collection_id,
        comment_id,
        is_read,
        created_at
      `
    )
    .eq('recipient_user_id', userId)
    .order('created_at', {
      ascending: false,
    })
    .returns<NotificationRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    mapNotificationRow
  );
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  if (!userId) {
    return 0;
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('recipient_user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  if (!notificationId) {
    return;
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
    })
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}

export async function markNotificationUnread(
  notificationId: string
): Promise<void> {
  if (!notificationId) {
    return;
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: false,
    })
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsRead(
  userId: string
): Promise<void> {
  if (!userId) {
    return;
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
    })
    .eq('recipient_user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }
}