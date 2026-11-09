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

      // Group Direct Messaging uses the existing trusted webhook, but never
      // sends message text, group names, rosters or collection metadata to Expo.
      // These events are only permitted from the DEVELOPMENT Supabase project.
      if (
        payload.type === "INSERT" &&
        payload.schema === "public" &&
        (payload.table === "dm_group_messages" || payload.table === "dm_group_members")
      ) {
        const projectUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
        if (projectUrl !== "https://kkltzygebomopysklaqq.supabase.co") {
          return Response.json({ skipped: true, reason: "Group push not enabled for this project." });
        }

        const event = payload.record as unknown as Record<string, unknown> | null;
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isUuid = (value: unknown): value is string =>
          typeof value === "string" && uuidPattern.test(value);
        const isMessage = payload.table === "dm_group_messages";
        let groupId: string;
        let recipientIds: string[] = [];
        let messageId: string | null = null;
        let senderId: string | null = null;
        let otherInviteParticipants: string[] = [];

        if (isMessage) {
          if (!isUuid(event?.id)) {
            return Response.json({ skipped: true, reason: "Invalid group message event." });
          }
          messageId = event.id;
          const { data: message, error: messageError } = await ctx.supabaseAdmin
            .from("dm_group_messages")
            .select("id,group_id,sender_id,created_at,removed_at")
            .eq("id", messageId)
            .maybeSingle();
          if (messageError) {
            console.error("Unable to resolve group message for push:", messageError);
            return Response.json({ error: "Group message lookup failed." }, { status: 500 });
          }
          if (!message || message.removed_at || !isUuid(message.group_id) || !isUuid(message.sender_id)) {
            return Response.json({ skipped: true, reason: "Group message unavailable." });
          }
          groupId = message.group_id;
          senderId = message.sender_id;

          const { data: members, error: memberError } = await ctx.supabaseAdmin
            .from("dm_group_members")
            .select("user_id,status,joined_at")
            .eq("group_id", groupId)
            .eq("status", "accepted");
          if (memberError) {
            console.error("Unable to check group membership for push:", memberError);
            return Response.json({ error: "Group membership lookup failed." }, { status: 500 });
          }
          // New members never receive notifications for pre-join messages.
          // Leaving/declined members do not receive pushes even if they were
          // present when the original message was sent.
          recipientIds = (members ?? [])
            .filter((member) =>
              member.user_id !== senderId &&
              member.joined_at !== null &&
              new Date(member.joined_at).getTime() <= new Date(message.created_at).getTime()
            )
            .map((member) => member.user_id);
        } else {
          if (!isUuid(event?.group_id) || !isUuid(event?.user_id)) {
            return Response.json({ skipped: true, reason: "Invalid group invitation event." });
          }
          groupId = event.group_id;
          const { data: invitation, error: inviteError } = await ctx.supabaseAdmin
            .from("dm_group_members")
            .select("group_id,user_id,invited_by,status")
            .eq("group_id", groupId)
            .eq("user_id", event.user_id)
            .maybeSingle();
          if (inviteError) {
            console.error("Unable to resolve group invitation for push:", inviteError);
            return Response.json({ error: "Group invitation lookup failed." }, { status: 500 });
          }
          if (!invitation || invitation.status !== "invited" ||
              !isUuid(invitation.invited_by) || invitation.invited_by === invitation.user_id) {
            return Response.json({ skipped: true, reason: "Group invitation unavailable." });
          }
          senderId = invitation.invited_by;
          const { data: inviter, error: inviterError } = await ctx.supabaseAdmin
            .from("dm_group_members")
            .select("status")
            .eq("group_id", groupId)
            .eq("user_id", senderId)
            .maybeSingle();
          if (inviterError) {
            console.error("Unable to check group inviter for push:", inviterError);
            return Response.json({ error: "Group inviter lookup failed." }, { status: 500 });
          }
          if (inviter?.status !== "accepted") {
            return Response.json({ skipped: true, reason: "Inviter no longer in group." });
          }
          // Mutual follow eligibility may have been revoked after invitation.
          const { data: follows, error: followError } = await ctx.supabaseAdmin
            .from("follows")
            .select("follower_id,following_id")
            .in("follower_id", [senderId, invitation.user_id])
            .in("following_id", [senderId, invitation.user_id]);
          if (followError) {
            console.error("Unable to check group follow state for push:", followError);
            return Response.json({ error: "Group follow lookup failed." }, { status: 500 });
          }
          if (!(follows ?? []).some((row) => row.follower_id === senderId && row.following_id === invitation.user_id) ||
              !(follows ?? []).some((row) => row.follower_id === invitation.user_id && row.following_id === senderId)) {
            return Response.json({ skipped: true, reason: "Invitation no longer eligible." });
          }
          // An invite is not eligible if the recipient is blocked by any
          // currently invited or accepted member, not only the inviter.
          const { data: roster, error: rosterError } = await ctx.supabaseAdmin
            .from("dm_group_members")
            .select("user_id,status")
            .eq("group_id", groupId)
            .in("status", ["accepted", "invited"]);
          if (rosterError) {
            console.error("Unable to check group invitation roster for push:", rosterError);
            return Response.json({ error: "Group invitation membership lookup failed." }, { status: 500 });
          }
          otherInviteParticipants = (roster ?? []).map((member) => member.user_id);
          recipientIds = [invitation.user_id];
        }

        if (!recipientIds.length || !senderId) {
          return Response.json({ success: true, sent: 0 });
        }
        // Re-read block state before sending. Any mutual block suppresses the
        // push; no identities in the minimal trigger payload are trusted.
        const participants = Array.from(new Set([senderId, ...recipientIds, ...otherInviteParticipants]));
        const { data: blocks, error: blocksError } = await ctx.supabaseAdmin
          .from("blocks")
          .select("blocker_id,blocked_user_id")
          .in("blocker_id", participants)
          .in("blocked_user_id", participants);
        if (blocksError) {
          console.error("Unable to check group block state for push:", blocksError);
          return Response.json({ error: "Group block lookup failed." }, { status: 500 });
        }
        const blockedRecipients = new Set<string>();
        for (const row of blocks ?? []) {
          if (row.blocker_id === senderId) blockedRecipients.add(row.blocked_user_id);
          if (row.blocked_user_id === senderId) blockedRecipients.add(row.blocker_id);
          if (!isMessage && row.blocker_id === recipientIds[0]) {
            blockedRecipients.add(recipientIds[0]);
          }
          if (!isMessage && row.blocked_user_id === recipientIds[0]) {
            blockedRecipients.add(recipientIds[0]);
          }
        }
        recipientIds = recipientIds.filter((id) => !blockedRecipients.has(id));
        if (!recipientIds.length) {
          return Response.json({ success: true, sent: 0 });
        }
        const { data: tokenRows, error: tokensError } = await ctx.supabaseAdmin
          .from("push_tokens")
          .select("user_id,expo_push_token")
          .in("user_id", recipientIds);
        if (tokensError) {
          console.error("Unable to load group push tokens:", tokensError);
          return Response.json({ error: "Group push tokens unavailable." }, { status: 500 });
        }
        const pushes = (tokenRows ?? [])
          .filter((token) => recipientIds.includes(token.user_id))
          .map((token) => ({
            to: token.expo_push_token,
            sound: "default",
            title: isMessage ? "New group message" : "New group invitation",
            body: isMessage ? "Tap to reply." : "Tap to respond.",
            data: {
              type: isMessage ? "group_message" : "group_invitation",
              groupId,
              recipientUserId: token.user_id,
              ...(messageId ? { messageId } : {}),
            },
          }));
        if (!pushes.length) {
          return Response.json({ success: true, sent: 0 });
        }
        // Expo allows at most 100 notifications in a single send request.
        // Do not log token values, group names, or message content.
        for (let offset = 0; offset < pushes.length; offset += 100) {
          const response = await fetch(EXPO_PUSH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pushes.slice(offset, offset + 100)),
          });
          if (!response.ok) {
            console.error("Expo group push request failed with status:", response.status);
            return Response.json({ error: "Expo group push request failed." }, { status: 502 });
          }
        }
        return Response.json({ success: true, sent: pushes.length });
      }

      // Direct Messages use the existing trusted push endpoint, but deliberately
      // do not create a second entry in the general Notifications feed. The DM
      // trigger sends only the message ID; all identities are re-read here.
      if (
        payload.type === "INSERT" &&
        payload.schema === "public" &&
        payload.table === "dm_messages"
      ) {
        const dmRecord = payload.record as unknown as { id?: unknown } | null;
        const messageId =
          dmRecord && typeof dmRecord.id === "string"
            ? dmRecord.id
            : null;
        if (!messageId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(messageId)) {
          return Response.json({ skipped: true, reason: "Invalid DM event." });
        }

        const { data: message, error: messageError } = await ctx.supabaseAdmin
          .from("dm_messages")
          .select("id,conversation_id,sender_id,removed_at")
          .eq("id", messageId)
          .maybeSingle();
        if (messageError) {
          console.error("Unable to resolve DM push event:", messageError);
          return Response.json({ error: "Unable to resolve DM event." }, { status: 500 });
        }
        if (!message || message.removed_at) {
          return Response.json({ skipped: true, reason: "Message unavailable." });
        }

        const { data: conversation, error: conversationError } = await ctx.supabaseAdmin
          .from("dm_conversations")
          .select("id,user_low_id,user_high_id")
          .eq("id", message.conversation_id)
          .maybeSingle();
        if (conversationError) {
          console.error("Unable to resolve DM conversation for push:", conversationError);
          return Response.json({ error: "Unable to resolve DM conversation." }, { status: 500 });
        }
        if (!conversation) {
          return Response.json({ skipped: true, reason: "Conversation unavailable." });
        }

        const senderId = message.sender_id;
        const recipientUserId =
          conversation.user_low_id === senderId
            ? conversation.user_high_id
            : conversation.user_high_id === senderId
              ? conversation.user_low_id
              : null;
        if (!recipientUserId || recipientUserId === senderId) {
          return Response.json({ skipped: true, reason: "Invalid DM participants." });
        }

        // Do not notify for messages from accounts blocked by either user,
        // including a block that happened after the original message insert.
        const { data: blocks, error: blockError } = await ctx.supabaseAdmin
          .from("blocks")
          .select("blocker_id,blocked_user_id")
          .in("blocker_id", [senderId, recipientUserId])
          .in("blocked_user_id", [senderId, recipientUserId]);
        if (blockError) {
          console.error("Unable to verify DM block state for push:", blockError);
          return Response.json({ error: "Unable to verify DM permissions." }, { status: 500 });
        }
        if ((blocks ?? []).some((b) =>
          (b.blocker_id === senderId && b.blocked_user_id === recipientUserId) ||
          (b.blocker_id === recipientUserId && b.blocked_user_id === senderId)
        )) {
          return Response.json({ skipped: true, reason: "DM participants blocked." });
        }

        const { data: dmTokens, error: dmTokensError } = await ctx.supabaseAdmin
          .from("push_tokens")
          .select("expo_push_token")
          .eq("user_id", recipientUserId);
        if (dmTokensError) {
          console.error("Unable to load DM recipient push tokens:", dmTokensError);
          return Response.json({ error: "Unable to load DM push tokens." }, { status: 500 });
        }
        if (!dmTokens?.length) {
          return Response.json({ success: true, sent: 0 });
        }

        const { data: dmSender, error: dmSenderError } = await ctx.supabaseAdmin
          .from("profiles")
          .select("display_name,username")
          .eq("id", senderId)
          .maybeSingle();
        if (dmSenderError) {
          console.error("Unable to load DM sender name for push:", dmSenderError);
          return Response.json({ error: "Unable to resolve DM sender." }, { status: 500 });
        }
        const actorName = getActorName(dmSender as ProfileRow | null);

        // No message body is included in the notification, event payload,
        // or OS badge. DM unread state is tracked separately from social badges.
        const dmPushes = (dmTokens as PushTokenRow[]).map(({ expo_push_token }) => ({
          to: expo_push_token,
          sound: "default",
          title: `New message from ${actorName}`,
          body: "Tap to reply.",
          data: {
            type: "direct_message",
            conversationId: conversation.id,
            messageId: message.id,
            actorUserId: senderId,
            recipientUserId,
          },
        }));
        const dmResponse = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dmPushes),
        });
        let dmResponseBody: unknown = null;
        try {
          dmResponseBody = await dmResponse.json();
        } catch {
          // Avoid logging any message contents or push token values.
        }
        if (!dmResponse.ok) {
          console.error("Expo DM push request failed with status:", dmResponse.status);
          return Response.json({ error: "Expo DM push request failed." }, { status: 502 });
        }
        return Response.json({ success: true, sent: dmPushes.length, expo: dmResponseBody });
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
