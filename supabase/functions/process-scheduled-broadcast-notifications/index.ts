// All-user scheduled push worker. INERT until deployment + separate explicit
// server secret, delivery-enable flag, and targeted invocation (or general
// claims flag) are all configured. Does not affect scheduled test worker.
import { createClient } from "npm:@supabase/supabase-js@^2";
import { isNotificationGenre } from "../_shared/notification-genres.ts";

const SECRET_HEADER = "x-scheduled-broadcast-worker-secret";
const CAMPAIGN_HEADER = "x-scheduled-broadcast-campaign-id";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_DEVICES = 500;
const BATCH_SIZE = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/;

type Recipient = { id: string; user_id: string; expo_push_token: string };
type DeliveryMode = "canary" | "full";
type Destination =
  | { categoryId: string; kind: "overall" }
  | { categoryId: string; kind: "type" | "theme" | "genre"; optionId: string };

type Campaign = {
  id: string; created_by: string | null; audience: string; status: string;
  title: string | null; message: string | null; category_id: string | null;
  destination_kind: string | null; option_id: string | null;
};

async function secretsMatch(supplied: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let different = 0;
  for (let i = 0; i < left.length; i++) different |= left[i] ^ right[i];
  return different === 0;
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!url || !key) throw new Error("Missing service-role configuration.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type AdminClient = ReturnType<typeof adminClient>;

async function markUnsent(client: AdminClient, id: string, error: string) {
  const result = await client.from("notification_campaigns")
    .update({ status: "failed", last_error: error.slice(0, 1000),
      updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "sending").eq("audience", "all")
    .select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("Unable to record unsent campaign.");
}

async function claim(client: AdminClient, targetId: string): Promise<string | null> {
  // One targeted campaign during QA; a separate general-claims switch is
  // required for routine scheduler invocations.
  const { data, error } = targetId
    ? await client.rpc("claim_specific_due_broadcast_campaign", { p_campaign_id: targetId })
    : await client.rpc("claim_due_broadcast_notification_campaign");
  if (error) throw new Error(`Unable to claim broadcast: ${error.message}`);
  if (data !== null &&
      (typeof data !== "string" || !UUID_PATTERN.test(data) ||
       (targetId && data.toLowerCase() !== targetId.toLowerCase()))) {
    throw new Error("Unexpected claimed broadcast campaign.");
  }
  return data;
}

async function verifyCampaign(client: AdminClient, id: string):
  Promise<{ campaign: Campaign; destination: Destination } | null> {
  const { data, error } = await client.from("notification_campaigns")
    .select("id,created_by,audience,status,title,message,category_id,destination_kind,option_id")
    .eq("id", id).eq("audience", "all").eq("status", "sending").maybeSingle();
  if (error) throw new Error("Unable to inspect claimed campaign.");
  const campaign = data as Campaign | null;
  if (!campaign || !campaign.created_by || !campaign.title?.trim() ||
      campaign.title.length > 100 || !campaign.message?.trim() ||
      campaign.message.length > 220 ||
      !campaign.category_id ||
      !["albums", "artists", "books", "games", "movies", "songs", "tv"]
        .includes(campaign.category_id)) return null;
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("is_admin").eq("id", campaign.created_by).maybeSingle();
  if (profileError || profile?.is_admin !== true) return null;

  if (campaign.destination_kind === "overall" && !campaign.option_id) {
    return { campaign, destination: { categoryId: campaign.category_id, kind: "overall" } };
  }
  if (campaign.destination_kind === "genre" &&
      isNotificationGenre(campaign.category_id, campaign.option_id)) {
    return { campaign, destination: {
      categoryId: campaign.category_id, kind: "genre", optionId: campaign.option_id as string,
    } };
  }
  if ((campaign.destination_kind === "type" || campaign.destination_kind === "theme") &&
      campaign.option_id) {
    const { data: option, error: optionError } = await client.from("collection_options")
      .select("id").eq("id", campaign.option_id)
      .eq("category_id", campaign.category_id)
      .eq("kind", campaign.destination_kind)
      .eq("active", true).maybeSingle();
    if (!optionError && option) {
      return { campaign, destination: {
        categoryId: campaign.category_id, kind: campaign.destination_kind,
        optionId: campaign.option_id,
      } };
    }
  }
  return null;
}

async function loadRecipients(client: AdminClient, mode: DeliveryMode): Promise<Recipient[]> {
  if (mode === "canary") {
    // A canary NEVER enumerates all registered devices.
    const deviceId = Deno.env.get("SCHEDULED_BROADCAST_CANARY_PUSH_TOKEN_ID")?.trim() ?? "";
    const userId = Deno.env.get("SCHEDULED_BROADCAST_CANARY_USER_ID")?.trim() ?? "";
    if (!UUID_PATTERN.test(deviceId) || !UUID_PATTERN.test(userId)) {
      throw new Error("Canary device/user configuration is invalid. No broadcast sent.");
    }
    const { data, error } = await client.from("push_tokens")
      .select("id,user_id,expo_push_token")
      .eq("id", deviceId).eq("user_id", userId).maybeSingle();
    if (error || !data || data.id !== deviceId || data.user_id !== userId ||
        typeof data.expo_push_token !== "string" ||
        !TOKEN_PATTERN.test(data.expo_push_token)) {
      throw new Error("Exact canary device unavailable. No broadcast sent.");
    }
    return [data as Recipient]; // EXACTLY one registered device; never all users.
  }
  if (Deno.env.get("SCHEDULED_BROADCAST_FULL_AUDIENCE_ENABLED") !== "true") {
    throw new Error("Full-audience delivery not explicitly enabled. No broadcast sent.");
  }
  // Fetch cap + 1 so nobody receives a silently truncated broadcast.
  const { data, error } = await client.from("push_tokens")
    .select("id,user_id,expo_push_token")
    .order("id", { ascending: true }).limit(MAX_DEVICES + 1);
  if (error || !Array.isArray(data)) throw new Error("Unable to read registered push devices.");
  if (data.length > MAX_DEVICES) throw new Error("Too many devices for this worker: no broadcast sent.");
  if (data.some((r) => !r.id || !r.user_id ||
      typeof r.expo_push_token !== "string" ||
      !TOKEN_PATTERN.test(r.expo_push_token))) {
    throw new Error("An invalid push token was found: no broadcast sent.");
  }
  if (new Set(data.map((r) => r.expo_push_token)).size !== data.length) {
    throw new Error("Duplicate push tokens were found: no broadcast sent.");
  }
  return data as Recipient[];
}

// Preserve the unread count shown inside Top 3: the app filters out actors
// blocked by this recipient but keeps actor-less announcements. No new RPC,
// migration or hidden secondary counter is required.
async function visibleUnreadBadgeCount(client: AdminClient, recipientUserId: string): Promise<number | null> {
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
    return null;
  }
}

// One lookup per account even when it has multiple registered devices.
// Never include a guess in the push payload if any read fails.
async function loadUnreadBadges(client: AdminClient, recipients: Recipient[]): Promise<Map<string, number>> {
  const badges = new Map<string, number>();
  const userIds = [...new Set(recipients.map((r) => r.user_id))];
  const COUNT_CONCURRENCY = 8;
  for (let start = 0; start < userIds.length; start += COUNT_CONCURRENCY) {
    await Promise.all(userIds.slice(start, start + COUNT_CONCURRENCY).map(async (userId) => {
      const count = await visibleUnreadBadgeCount(client, userId);
      if (count === null) {
        console.error("Visible broadcast unread badge lookup unavailable; omitting badge.");
      } else {
        badges.set(userId, count);
      }
    }));
  }
  return badges;
}

async function deliver(client: AdminClient, id: string, mode: DeliveryMode): Promise<{ accepted: number; failed: number; inAppCreated: number; inAppSucceeded: boolean; campaignStatus: "sent" | "failed" }> {
  const verified = await verifyCampaign(client, id);
  if (!verified) {
    await markUnsent(client, id, "Administrator or destination invalid. No broadcast sent.");
    return { accepted: 0, failed: 0, inAppCreated: 0, inAppSucceeded: false, campaignStatus: "failed" };
  }
  if (mode === "canary" &&
      verified.campaign.created_by !== Deno.env.get("SCHEDULED_BROADCAST_CANARY_USER_ID")?.trim()) {
    await markUnsent(client, id, "Canary campaign owner does not match the permitted device owner. No broadcast sent.");
    return { accepted: 0, failed: 0, inAppCreated: 0, inAppSucceeded: false, campaignStatus: "failed" };
  }
  let recipients: Recipient[];
  try { recipients = await loadRecipients(client, mode); }
  catch (error) {
    await markUnsent(client, id, error instanceof Error ? error.message : "Audience unavailable. No broadcast sent.");
    return { accepted: 0, failed: 0, inAppCreated: 0, inAppSucceeded: false, campaignStatus: "failed" };
  }
  // Full-audience announcements include verified accounts without push tokens.
  // Canary mode still requires exactly its configured device.
  if (recipients.length === 0 && mode === "canary") {
    await markUnsent(client, id, "No canary push device. No broadcast sent.");
    return { accepted: 0, failed: 0, inAppCreated: 0, inAppSucceeded: false, campaignStatus: "failed" };
  }
  // Store the immutable target count before any Expo request.
  const started = await client.from("notification_campaigns")
    .update({ target_count: recipients.length, updated_at: new Date().toISOString() })
    .eq("id", id).eq("audience", "all").eq("status", "sending")
    .select("id").maybeSingle();
  if (started.error || !started.data) throw new Error("Unable to record audience before send.");

  // Record announcement rows BEFORE constructing iOS badge counts.
  // An unread badge must represent a notification the user can actually view.
  // This remains guarded by the same campaign claim and audience/canary checks.
  let inAppCreated = 0;
  let announcementError: string | null = null;
  try {
    const canaryUserId = mode === "canary"
      ? Deno.env.get("SCHEDULED_BROADCAST_CANARY_USER_ID")?.trim() ?? null
      : null;
    const { data, error } = await client.rpc("create_campaign_announcement_recipients", {
      p_campaign_id: id,
      p_mode: mode,
      p_canary_user_id: canaryUserId,
    });
    if (error || typeof data !== "number" || !Number.isInteger(data) || data < 0) {
      throw new Error(error?.message ?? "Unexpected in-app announcement result.");
    }
    inAppCreated = data;
  } catch (error) {
    announcementError = error instanceof Error ? error.message : "In-app announcement creation failed.";
    console.error("In-app announcements failed for campaign:", id, announcementError);
  }

  const inAppSucceeded = announcementError === null;
  // If in-app creation fails, do not send a push telling someone about an
  // announcement they cannot open. Never retry a claimed campaign automatically.
  const unreadBadges = inAppSucceeded
    ? await loadUnreadBadges(client, recipients)
    : new Map<string, number>();
  let accepted = 0;
  let reason: string | null = inAppSucceeded ? null : "In-app announcement creation failed; push not sent.";
  if (inAppSucceeded) {
    for (let start = 0; start < recipients.length; start += BATCH_SIZE) {
      const chunk = recipients.slice(start, start + BATCH_SIZE);
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunk.map((r) => ({
            to: r.expo_push_token, sound: "default",
            title: verified.campaign.title, body: verified.campaign.message,
            ...(unreadBadges.has(r.user_id) ? { badge: unreadBadges.get(r.user_id) } : {}),
            data: { type: "top3_campaign", destination: verified.destination },
          }))),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`Expo HTTP ${response.status}; delivery uncertain.`);
        const parsed: unknown = await response.json();
        const tickets = (parsed as { data?: unknown } | null)?.data;
        if (!Array.isArray(tickets) || tickets.length !== chunk.length)
          throw new Error("Unconfirmed Expo ticket response; no retries.");
        for (const ticket of tickets) {
          if (ticket && typeof ticket === "object" &&
              "status" in ticket && ticket.status === "ok") accepted++;
          else reason = "One or more push tokens were rejected by Expo.";
        }
      } catch (error) {
        reason = error instanceof Error ? error.message : "Expo request outcome uncertain.";
        // Deliberately no automatic retries; failures may have sent pushes.
        break;
      }
    }
  }

  const failed = recipients.length - accepted;
  // "failed" means at least one channel was incomplete or uncertain; it
  // does NOT mean that already accepted pushes or in-app rows were undone.
  // No automatic retries: they could send push notifications twice.
  const complete = failed === 0 && inAppSucceeded;
  const campaignStatus: "sent" | "failed" = complete ? "sent" : "failed";
  const outcome = {
    campaignId: id, mode, pushTargets: recipients.length,
    pushAccepted: accepted, pushFailedOrUnconfirmed: failed,
    inAppCreated, inAppSucceeded, campaignStatus,
  };
  console.info("TOP3_BROADCAST_DELIVERY_OUTCOME", JSON.stringify(outcome));
  const errors: string[] = [];
  if (failed > 0) errors.push(`Push accepted ${accepted}/${recipients.length}; remaining failed or unconfirmed`);
  if (reason) errors.push(`Push: ${reason}`);
  if (announcementError) errors.push(`In-app: ${announcementError}`);
  if (!complete && inAppSucceeded)
    errors.push(`In-app announcements created (${inAppCreated} new rows); do not automatically retry pushes`);
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await client.from("notification_campaigns")
    .update({ status: campaignStatus, accepted_count: accepted,
      failed_count: failed, sent_at: complete ? now : null,
      last_error: complete ? null : errors.join(" | ").slice(0, 1000),
      updated_at: now })
    .eq("id", id).eq("audience", "all").eq("status", "sending")
    .select("id").maybeSingle();
  if (updateError || !updated) {
    console.error("TOP3_BROADCAST_OUTCOME_NOT_RECORDED", JSON.stringify(outcome));
    throw new Error("Broadcast status update failed; push and/or in-app delivery may already have occurred. Inspect logs and History; do not retry automatically.");
  }
  return { accepted, failed, inAppCreated, inAppSucceeded, campaignStatus };
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
    const secret = Deno.env.get("SCHEDULED_BROADCAST_WORKER_SECRET")?.trim();
    if (!secret || secret.length < 32) return Response.json({ error: "Worker unavailable." }, { status: 503 });
    if (!(await secretsMatch(request.headers.get(SECRET_HEADER) ?? "", secret)))
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    if (Deno.env.get("SCHEDULED_BROADCAST_DELIVERY_ENABLED") !== "true")
      return Response.json({ error: "Broadcast delivery disabled." }, { status: 503 });

    // No default delivery mode: an enabled delivery flag alone can NEVER broadcast.
    const rawMode = Deno.env.get("SCHEDULED_BROADCAST_SEND_MODE")?.trim();
    if (rawMode !== "canary" && rawMode !== "full")
      return Response.json({ error: "Explicit delivery mode required." }, { status: 503 });
    const mode: DeliveryMode = rawMode;
    if (mode === "full" &&
        Deno.env.get("SCHEDULED_BROADCAST_FULL_AUDIENCE_ENABLED") !== "true")
      return Response.json({ error: "Full-audience sending disabled." }, { status: 503 });
    // A full broadcast cannot start while old canary allowlist settings remain.
    if (mode === "full" &&
        (Deno.env.get("SCHEDULED_BROADCAST_CANARY_CAMPAIGN_ID") ||
         Deno.env.get("SCHEDULED_BROADCAST_CANARY_PUSH_TOKEN_ID") ||
         Deno.env.get("SCHEDULED_BROADCAST_CANARY_USER_ID")))
      return Response.json({ error: "Remove canary configuration before full delivery." }, { status: 503 });
    if (mode === "canary" &&
        (Deno.env.get("SCHEDULED_BROADCAST_FULL_AUDIENCE_ENABLED") === "true" ||
         Deno.env.get("SCHEDULED_BROADCAST_ALLOW_GENERAL_CLAIMS") === "true"))
      return Response.json({ error: "Conflicting canary/general configuration." }, { status: 503 });

    const target = (request.headers.get(CAMPAIGN_HEADER) ?? "").trim();
    if (target && !UUID_PATTERN.test(target))
      return Response.json({ error: "Invalid campaign identifier." }, { status: 400 });
    if (mode === "canary") {
      const expectedCampaign = Deno.env.get("SCHEDULED_BROADCAST_CANARY_CAMPAIGN_ID")?.trim() ?? "";
      const expectedDevice = Deno.env.get("SCHEDULED_BROADCAST_CANARY_PUSH_TOKEN_ID")?.trim() ?? "";
      const expectedUser = Deno.env.get("SCHEDULED_BROADCAST_CANARY_USER_ID")?.trim() ?? "";
      if (!UUID_PATTERN.test(expectedCampaign) ||
          !UUID_PATTERN.test(expectedDevice) || !UUID_PATTERN.test(expectedUser))
        return Response.json({ error: "Canary configuration missing." }, { status: 503 });
      if (!target || target.toLowerCase() !== expectedCampaign.toLowerCase())
        return Response.json({ error: "Campaign not authorized for canary." }, { status: 403 });
    }
    if (!target && Deno.env.get("SCHEDULED_BROADCAST_ALLOW_GENERAL_CLAIMS") !== "true")
      return Response.json({ error: "General broadcast claims disabled." }, { status: 503 });

    try {
      const client = adminClient();
      const recovery = target ? null :
        await client.rpc("mark_stale_scheduled_broadcasts_unconfirmed");
      if (recovery?.error) throw new Error("Unable to inspect stale broadcasts.");
      const id = await claim(client, target);
      if (!id) return Response.json({ success: true, processed: 0, recovered: recovery?.data ?? 0 });
      const result = await deliver(client, id, mode);
      return Response.json({ success: true, processed: 1, campaignId: id, mode, ...result,
        note: "Expo acceptance is not proof of device delivery." });
    } catch (error) {
      console.error("Broadcast worker stopped:", error instanceof Error ? error.message : "Unknown error");
      // A claimed campaign is not automatically retried. Stale recovery marks
      // unconfirmed work failed after 15 minutes.
      return Response.json({ error: "Broadcast processing failed; inspect History before retrying." }, { status: 500 });
    }
  },
};
