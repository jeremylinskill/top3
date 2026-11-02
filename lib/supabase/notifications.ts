import { supabase } from '@/lib/supabase';

export type CampaignAnnouncement = {
  campaignId: string;
  title: string;
  message: string;
  destinationKind: string;
  categoryId: string;
  optionId: string | null;
};

type CampaignAnnouncementRow = {
  notification_id: string;
  campaign_id: string;
  title: string;
  message: string;
  destination_kind: string;
  category_id: string;
  option_id: string | null;
};

export type NotificationType =
  | 'like'
  | 'comment'
  | 'comment_reply'
  | 'comment_like'
  | 'follow'
  | 'follow_request_accepted'
  | 'announcement';

export type Notification = {
  id: string;
  recipientUserId: string;
  actorUserId: string | null;
  announcement?: CampaignAnnouncement;
  type: NotificationType;
  collectionId?: string;
  commentId?: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
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

  const mapped = (data ?? []).map(mapNotificationRow);
  if (!mapped.some((notification) => notification.type === 'announcement')) {
    return mapped;
  }

  // The campaign table is admin-only. This RPC returns only announcements
  // belonging to the signed-in user, with no privileged client-side access.
  const { data: announcements, error: announcementError } = await supabase
    .rpc('get_my_campaign_announcements');
  if (announcementError) throw announcementError;
  if (!Array.isArray(announcements)) {
    throw new Error('Unexpected announcement response from Supabase.');
  }
  // Supabase's generated RPC type may describe a single record even though
  // this database function returns SETOF rows. Validate before narrowing.
  const announcementRows = announcements as CampaignAnnouncementRow[];
  const byNotificationId = new Map<string, CampaignAnnouncementRow>(
    announcementRows.map((row) => [row.notification_id, row])
  );
  return mapped.map((notification) => {
    if (notification.type !== 'announcement') return notification;
    const row = byNotificationId.get(notification.id);
    if (!row) return notification;
    return {
      ...notification,
      announcement: {
        campaignId: row.campaign_id,
        title: row.title,
        message: row.message,
        destinationKind: row.destination_kind,
        categoryId: row.category_id,
        optionId: row.option_id,
      },
    };
  });
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
