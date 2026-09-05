// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const EXPO_PUSH_URL =
  "https://exp.host/--/api/v2/push/send";

type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "follow_request_accepted";

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
}: {
  notification: NotificationRow;
  actorName: string;
  collectionTitle: string | null;
}) {
  const title = "Top 3";
  const pushCollectionTitle =
    getPushCollectionTitle(
      collectionTitle
    );

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

      const {
        title,
        body,
      } = getPushCopy({
        notification,
        actorName,
        collectionTitle,
      });

      const messages =
        pushTokens.map(
          ({ expo_push_token }) => ({
            to: expo_push_token,
            sound: "default",
            title,
            body,
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