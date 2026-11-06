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

export type Top3RequestNotificationDetails = {
  categoryId: string;
  destinationKind: 'overall' | 'type' | 'theme' | 'genre';
  optionId: string | null;
  topicLabel: string | null;
  status: 'pending' | 'fulfilled' | 'dismissed';
  fulfilledCollectionId: string | null;
};

type Top3RequestNotificationRow = {
  id: string;
  category_id: string;
  destination_kind: Top3RequestNotificationDetails['destinationKind'];
  option_id: string | null;
  topic_label: string | null;
  status: Top3RequestNotificationDetails['status'];
  fulfilled_collection_id: string | null;
};

export type NotificationType =
  | 'like'
  | 'comment'
  | 'comment_reply'
  | 'comment_like'
  | 'follow'
  | 'follow_request_accepted'
  | 'announcement'
  | 'top3_request'
  | 'top3_request_fulfilled';

export type Notification = {
  id: string;
  recipientUserId: string;
  actorUserId: string | null;
  announcement?: CampaignAnnouncement;
  type: NotificationType;
  collectionId?: string;
  commentId?: string;
  top3RequestId?: string;
  top3Request?: Top3RequestNotificationDetails;
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
  top3_request_id: string | null;
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
    top3RequestId: row.top3_request_id ?? undefined,
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
        top3_request_id,
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

  // Read the specific topics in one query for the signed-in recipient.
  // Keeping the details separate from the notification row means existing
  // request notifications can show their topic without being recreated.
  const requestIds = [...new Set(mapped
    .filter((notification) => notification.type === 'top3_request')
    .map((notification) => notification.top3RequestId)
    .filter((id): id is string => Boolean(id)))];
  let withRequestDetails = mapped;
  if (requestIds.length > 0) {
    const { data: requests, error: requestError } = await supabase
      .from('top3_requests')
      .select('id,category_id,destination_kind,option_id,topic_label,status,fulfilled_collection_id')
      .eq('recipient_user_id', userId)
      .in('id', requestIds)
      .returns<Top3RequestNotificationRow[]>();

    if (requestError) {
      // A missing or inaccessible request must never break Notifications.
      if (__DEV__) console.warn('Unable to load Top 3 request titles:', requestError);
    } else {
      const byId = new Map((requests ?? []).map((request) => [request.id, request]));
      withRequestDetails = mapped.map((notification) => {
        if (notification.type !== 'top3_request' || !notification.top3RequestId) {
          return notification;
        }
        const request = byId.get(notification.top3RequestId);
        if (!request) return notification;
        return {
          ...notification,
          top3Request: {
            categoryId: request.category_id,
            destinationKind: request.destination_kind,
            optionId: request.option_id,
            topicLabel: request.topic_label,
            status: request.status,
            fulfilledCollectionId: request.fulfilled_collection_id,
          },
        };
      });
    }
  }

  if (!withRequestDetails.some((notification) => notification.type === 'announcement')) {
    return withRequestDetails;
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
  return withRequestDetails.map((notification) => {
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

// Deletes only a notification belonging to the signed-in recipient.
// The server atomically dismisses any still-pending linked Top 3 request.
export async function deleteMyNotification(notificationId: string): Promise<void> {
  if (!notificationId) throw new Error('Missing notification ID.');
  const { data, error } = await supabase.rpc('delete_my_notification', {
    p_notification_id: notificationId,
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error('This notification is no longer available.');
}
