// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { getFulfilledTop3RequestMessage } from '../_shared/top3-request-fulfilled-copy.ts';
import {
  getTop3RequestNotificationTitle,
  getTop3RequestPushBody,
  type Top3RequestCopyDetails,
} from "../_shared/top3-request-notification-copy.ts";

const EXPO_PUSH_URL =
  "https://exp.host/--/api/v2/push/send";

type NotificationType =
  | "like"
  | "comment"
  | "comment_reply"
  | "comment_like"
  | "follow"
  | "follow_request_accepted"
  | "announcement"
  | "top3_request"
  | "top3_request_fulfilled";

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  type: NotificationType;
  collection_id: string | null;
  comment_id: string | null;
  top3_request_id?: string | null;
  is_read: boolean;
  created_at: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: NotificationRow | null;
  old_record: NotificationRow | null;
};

type PushTokenRow = {
  expo_push_token: string;
};

type ProfileRow = {
  display_name: string | null;
  username: string | null;
};

type CollectionRow = {
  title: string | null;
};

function getActorName(
  profile: ProfileRow | null
): string {
  return (
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    "Someone"
  );
}

function getPushCollectionTitle(
  collectionTitle: string | null
): string | null {
  if (!collectionTitle) {
    return null;
  }

  return collectionTitle.replace(
    /^Top 3 All\s+/i,
    "Top 3 "
  );
}

function getPushCopy({
  notification,
  actorName,
  collectionTitle,
  requestTitle,
}: {
  notification: NotificationRow;
  actorName: string;
  collectionTitle: string | null;
  requestTitle: string | null;
}) {
  const title = "Top 3";
  const pushCollectionTitle =
    getPushCollectionTitle(
      collectionTitle
    );

  if (notification.type === "top3_request") {
    return { title, body: getTop3RequestPushBody(actorName, requestTitle) };
  }
  if (notification.type === "top3_request_fulfilled") {
    return { title, body: `${actorName} ${getFulfilledTop3RequestMessage(collectionTitle)}` };
  }
  if (notification.type === "like") {
    return {
      title,
      body: pushCollectionTitle
        ? `${actorName} liked your ${pushCollectionTitle}.`
        : `${actorName} liked your Top 3.`,
    };
  }

  if (notification.type === "comment") {
    return {
      title,
      body: pushCollectionTitle
        ? `${actorName} commented on your ${pushCollectionTitle}.`
        : `${actorName} commented on your Top 3.`,
    };
  }

  if (
    notification.type ===
    "comment_reply"
  ) {
    return {
      title,
      body:
        `${actorName} replied to your comment.`,
    };
  }

  if (
    notification.type ===
    "comment_like"
  ) {
    return {
      title,
      body:
        `${actorName} liked your comment.`,
    };
  }

  if (
    notification.type ===
    "follow_request_accepted"
  ) {
    return {
      title,
      body:
        `${actorName} accepted your follow request.`,
    };
  }

  return {
    title,
    body: `${actorName} started following you.`,
  };
}

export default {
  fetch: withSupabase(
    {
      auth: "secret:push_notification_webhook",
    },
    async (request, ctx) => {
      if (request.method !== "POST") {
        return Response.json(
          {
            error: "Method not allowed.",
          },
          {
            status: 405,
          }
        );
      }

      let payload: WebhookPayload;

      try {
        payload =
          await request.json() as WebhookPayload;
      } catch {
        return Response.json(
          {
            error: "Invalid JSON payload.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        payload.type !== "INSERT" ||
        payload.schema !== "public" ||
        payload.table !== "notifications" ||
        !payload.record
      ) {
        return Response.json({
          skipped: true,
        });
      }

      const notification =
        payload.record;

      // Campaign announcements are sent by the broadcast worker.
      // Never interpret them as social notifications or send a second push.
      if (notification.type === "announcement") {
        return Response.json({
          skipped: true,
          reason: "Campaign announcements use the broadcast worker.",
        });
      }

      // Only social notifications reach this handler. They require an actor.
      // A malformed actor-less social event must never become a follow push.
      if (!notification.actor_user_id) {
        return Response.json({
          skipped: true,
          reason: "Social notification missing actor.",
        });
      }

      const {
        data: pushTokenData,
        error: pushTokenError,
      } = await ctx.supabaseAdmin
        .from("push_tokens")
        .select("expo_push_token")
        .eq(
          "user_id",
          notification.recipient_user_id
        );

      if (pushTokenError) {
        console.error(
          "Failed to load push tokens:",
          pushTokenError
        );

        return Response.json(
          {
            error:
              "Failed to load push tokens.",
          },
          {
            status: 500,
          }
        );
      }

      const pushTokens =
        (pushTokenData ??
          []) as PushTokenRow[];

      if (pushTokens.length === 0) {
        return Response.json({
          success: true,
          sent: 0,
        });
      }

      const {
        data: actorProfileData,
        error: actorProfileError,
      } = await ctx.supabaseAdmin
        .from("profiles")
        .select(
          "display_name, username"
        )
        .eq(
          "id",
          notification.actor_user_id
        )
        .maybeSingle();

      if (actorProfileError) {
        console.error(
          "Failed to load notification actor profile:",
          actorProfileError
        );
      }

      let collectionTitle: string | null =
        null;

      if (notification.collection_id) {
        const {
          data: collectionData,
          error: collectionError,
        } = await ctx.supabaseAdmin
          .from("collections")
          .select("title")
          .eq(
            "id",
            notification.collection_id
          )
          .maybeSingle();

        if (collectionError) {
          console.error(
            "Failed to load notification collection:",
            collectionError
          );
        } else {
          collectionTitle =
            (
              collectionData as
                CollectionRow | null
            )?.title ?? null;
        }
      }

      const actorName =
        getActorName(
          actorProfileData as
            ProfileRow | null
        );

      // A notification INSERT webhook can omit columns added after that
      // webhook was configured. Re-read the persisted notification to resolve
      // its exact request ID, rather than guessing from pending requests.
      // Always scope the lookup to the webhook's recipient and event type.
      let top3RequestId: string | null = notification.top3_request_id ?? null;
      let requestTitle: string | null = null;
      if (notification.type === "top3_request") {
        const { data: savedNotification, error: savedError } = await ctx.supabaseAdmin
          .from("notifications")
          .select("top3_request_id")
          .eq("id", notification.id)
          .eq("recipient_user_id", notification.recipient_user_id)
          .eq("type", "top3_request")
          .maybeSingle();
        if (savedError) {
          console.error("Unable to resolve Top 3 request from notification:", savedError);
        } else if (savedNotification?.top3_request_id) {
          if (!top3RequestId) {
            console.warn("Top 3 request ID absent from webhook; recovered from saved notification.");
          }
          top3RequestId = savedNotification.top3_request_id;
        }

        if (top3RequestId) {
          const { data: requestDetails, error: requestError } = await ctx.supabaseAdmin
            .from("top3_requests")
            .select("category_id,destination_kind,topic_label")
            .eq("id", top3RequestId)
            .eq("recipient_user_id", notification.recipient_user_id)
            .maybeSingle();
          if (requestError) {
            console.error("Unable to load Top 3 request title for push:", requestError);
          } else if (requestDetails) {
            const details: Top3RequestCopyDetails = {
              categoryId: requestDetails.category_id,
              destinationKind: requestDetails.destination_kind,
              topicLabel: requestDetails.topic_label,
            };
            requestTitle = getTop3RequestNotificationTitle(details);
            if (!requestTitle) {
              console.warn("Top 3 request title unavailable for push: unsupported saved request details.");
            }
          } else {
            console.warn("Top 3 request title unavailable for push: request record not found.");
          }
        } else {
          console.warn("Top 3 request push has no linked request ID after database lookup.");
        }
      }
      const { title, body } = getPushCopy({
        notification,
        actorName,
        collectionTitle,
        requestTitle,
      });

      // The INSERT webhook runs after its in-app notification exists.
      // Badge lookup is optional: failure must never stop a social push.
      const badgeCount = await (async (): Promise<number | null> => {
        const client = ctx.supabaseAdmin;
        const recipientUserId = notification.recipient_user_id;
        try {
      // Keep iOS icon badges equal to the Notifications tab: hide unread
      // notifications whose actor is blocked by this recipient. Actor-less
      // announcement notifications remain visible and must still count.
      const { count: total, error: totalError } = await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", recipientUserId)
        .eq("is_read", false);
      if (totalError || typeof total !== "number" ||
          !Number.isSafeInteger(total) || total < 0) return null;

      let hidden = 0;
      const BLOCK_PAGE_SIZE = 500;
      const BLOCK_BATCH_SIZE = 100;
      for (let offset = 0; ; offset += BLOCK_PAGE_SIZE) {
        const { data: blockRows, error: blockError } = await client
          .from("blocks")
          .select("blocked_user_id")
          .eq("blocker_id", recipientUserId)
          .order("blocked_user_id", { ascending: true })
          .range(offset, offset + BLOCK_PAGE_SIZE - 1);
        if (blockError || !Array.isArray(blockRows)) return null;
        const blockedIds = blockRows.map((row) => row.blocked_user_id);
        if (blockedIds.some((value) => typeof value !== "string" || !value)) return null;
        for (let index = 0; index < blockedIds.length; index += BLOCK_BATCH_SIZE) {
          const { count: hiddenCount, error: hiddenError } = await client
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("recipient_user_id", recipientUserId)
            .eq("is_read", false)
            .in("actor_user_id", blockedIds.slice(index, index + BLOCK_BATCH_SIZE));
          if (hiddenError || typeof hiddenCount !== "number" ||
              !Number.isSafeInteger(hiddenCount) || hiddenCount < 0) return null;
          hidden += hiddenCount;
        }
        if (blockRows.length < BLOCK_PAGE_SIZE) break;
      }
      return hidden <= total ? total - hidden : null;
        } catch {
          console.error("Visible unread badge lookup failed; omitting push badge.");
          return null;
        }
      })();
      if (badgeCount === null) {
        console.error("Visible unread badge count unavailable; omitting push badge.");
      }

      const messages =
        pushTokens.map(
          ({ expo_push_token }) => ({
            to: expo_push_token,
            sound: "default",
            title,
            body,
            ...(badgeCount === null ? {} : { badge: badgeCount }),
            data: {
              notificationId:
                notification.id,
              type:
                notification.type,
              actorUserId:
                notification.actor_user_id,
              collectionId:
                notification.collection_id,
              commentId:
                notification.comment_id,
              top3RequestId,
            },
          })
        );

      const response =
        await fetch(
          EXPO_PUSH_URL,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(messages),
          }
        );

      const responseBody =
        await response.json();

      if (!response.ok) {
        console.error(
          "Expo push request failed:",
          responseBody
        );

        return Response.json(
          {
            error:
              "Expo push request failed.",
            details:
              responseBody,
          },
          {
            status: 502,
          }
        );
      }

      return Response.json({
        success: true,
        sent: messages.length,
        expo: responseBody,
      });
    }
  ),
};
