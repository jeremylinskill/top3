// Scheduled test notification worker.
// Delivery remains disabled until explicitly implemented and reviewed.

import { createClient } from "npm:@supabase/supabase-js@^2";

const WORKER_SECRET_NAME = "SCHEDULED_TEST_WORKER_SECRET";
const WORKER_SECRET_HEADER = "x-scheduled-test-worker-secret";

async function secretsMatch(
  supplied: string,
  expected: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  const [suppliedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);

  const left = new Uint8Array(suppliedHash);
  const right = new Uint8Array(expectedHash);

  let difference = 0;

  for (let i = 0; i < left.length; i++) {
    difference |= left[i] ^ right[i];
  }

  return difference === 0;
}

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase worker environment is not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function claimNextDueTestCampaign(
  client: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  const { data, error } = await client.rpc(
    "claim_due_test_notification_campaign"
  );

  if (error) {
    throw new Error(
      `Unable to claim scheduled test: ${error.message}`
    );
  }

  if (
    data !== null &&
    (typeof data !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data))
  ) {
    throw new Error("Invalid claimed campaign identifier.");
  }

  return data;
}

// Claim only the explicitly requested campaign.
// Never fall back to another scheduled notification.
async function claimSpecificDueTestCampaign(
  client: ReturnType<typeof createAdminClient>,
  campaignId: string
): Promise<string | null> {
  const { data, error } = await client.rpc(
    "claim_specific_due_test_campaign",
    { p_campaign_id: campaignId }
  );

  if (error) {
    throw new Error(
      `Unable to claim targeted test: ${error.message}`
    );
  }

  if (data !== null && data !== campaignId) {
    throw new Error("Unexpected targeted campaign identifier.");
  }

  return data;
}

type SupabaseAdminClient =
  ReturnType<typeof createAdminClient>;

type TestDestination =
  | { categoryId: string; kind: "overall" }
  | {
      categoryId: string;
      kind: "type" | "theme";
      optionId: string;
    };

type VerifiedTestDelivery = {
  campaignId: string;
  title: string;
  message: string;
  destination: TestDestination;
  expoPushToken: string;
};

type VerificationResult =
  | { ok: true; delivery: VerifiedTestDelivery }
  | { ok: false; reason: string };

async function verifyClaimedTestDelivery(
  client: SupabaseAdminClient,
  campaignId: string
): Promise<VerificationResult> {
  const { data: campaign, error: campaignError } =
    await client
      .from("notification_campaigns")
      .select(
        "id,created_by,title,message,category_id,destination_kind,option_id,audience,status,target_push_token_id"
      )
      .eq("id", campaignId)
      .eq("status", "sending")
      .eq("audience", "test")
      .maybeSingle();

  if (campaignError) {
    throw new Error(
      `Campaign verification failed: ${campaignError.message}`
    );
  }

  if (
    !campaign ||
    campaign.audience !== "test" ||
    campaign.status !== "sending" ||
    !campaign.created_by ||
    !campaign.target_push_token_id
  ) {
    return {
      ok: false,
      reason: "Claimed test or original device is unavailable.",
    };
  }

  const { data: profile, error: profileError } =
    await client
      .from("profiles")
      .select("is_admin")
      .eq("id", campaign.created_by)
      .maybeSingle();

  if (profileError) {
    throw new Error(
      `Administrator verification failed: ${profileError.message}`
    );
  }

  if (profile?.is_admin !== true) {
    return {
      ok: false,
      reason: "Administrator access is no longer valid.",
    };
  }

  const { data: token, error: tokenError } =
    await client
      .from("push_tokens")
      .select("expo_push_token")
      .eq("id", campaign.target_push_token_id)
      .eq("user_id", campaign.created_by)
      .maybeSingle();

  if (tokenError) {
    throw new Error(
      `Device verification failed: ${tokenError.message}`
    );
  }

  if (
    !token ||
    typeof token.expo_push_token !== "string" ||
    !/^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/.test(
      token.expo_push_token
    )
  ) {
    return {
      ok: false,
      reason: "Registered test device is no longer available.",
    };
  }

  const categories = [
    "albums", "artists", "books", "games",
    "movies", "songs", "tv",
  ];

  if (
    typeof campaign.title !== "string" ||
    campaign.title.trim().length < 1 ||
    campaign.title.length > 100 ||
    typeof campaign.message !== "string" ||
    campaign.message.trim().length < 1 ||
    campaign.message.length > 220 ||
    !categories.includes(campaign.category_id)
  ) {
    return {
      ok: false,
      reason: "Notification content is no longer valid.",
    };
  }

  let destination: TestDestination;

  if (campaign.destination_kind === "overall") {
    if (campaign.option_id !== null) {
      return {
        ok: false,
        reason: "Notification destination is invalid.",
      };
    }

    destination = {
      categoryId: campaign.category_id,
      kind: "overall",
    };
  } else if (
    (campaign.destination_kind === "type" ||
      campaign.destination_kind === "theme") &&
    typeof campaign.option_id === "string" &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(campaign.option_id)
  ) {
    const { data: option, error: optionError } =
      await client
        .from("collection_options")
        .select("id")
        .eq("id", campaign.option_id)
        .eq("category_id", campaign.category_id)
        .eq("kind", campaign.destination_kind)
        .eq("active", true)
        .maybeSingle();

    if (optionError) {
      throw new Error(
        `Destination verification failed: ${optionError.message}`
      );
    }

    if (!option) {
      return {
        ok: false,
        reason: "Notification destination is no longer available.",
      };
    }

    destination = {
      categoryId: campaign.category_id,
      kind: campaign.destination_kind,
      optionId: campaign.option_id,
    };
  } else {
    return {
      ok: false,
      reason: "Notification destination is invalid.",
    };
  }

  return {
    ok: true,
    delivery: {
      campaignId: campaign.id,
      title: campaign.title.trim(),
      message: campaign.message.trim(),
      destination,
      expoPushToken: token.expo_push_token,
    },
  };
}

// Use only when no Expo request has been attempted.
// An uncertain delivery outcome must be handled separately.
async function markClaimedTestNotSent(
  client: SupabaseAdminClient,
  campaignId: string,
  reason: string
): Promise<void> {
  const failureReason =
    reason.trim().slice(0, 1000) ||
    "Scheduled test was not sent.";

  const { data, error } = await client
    .from("notification_campaigns")
    .update({
      status: "failed",
      target_count: 0,
      accepted_count: 0,
      failed_count: 0,
      last_error: failureReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("audience", "test")
    .eq("status", "sending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to record unsent test: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Claimed test is no longer available for failure recording."
    );
  }
}

type ExpoDeliveryResult =
  | { kind: "accepted"; ticketId: string | null }
  | { kind: "rejected"; reason: string }
  | { kind: "uncertain"; reason: string };

// Submit exactly one push request.
// Never retry from this helper.
async function sendScheduledTestToExpo(
  delivery: VerifiedTestDelivery
): Promise<ExpoDeliveryResult> {
  let response: Response;

  try {
    response = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: delivery.expoPushToken,
          sound: "default",
          title: delivery.title,
          body: delivery.message,
          data: {
            type: "top3_campaign",
            destination: delivery.destination,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
  } catch (error) {
    return {
      kind: "uncertain",
      reason:
        "Expo request outcome is uncertain: " +
        (error instanceof Error ? error.message : "Network error."),
    };
  }

  if (!response.ok) {
    return {
      kind: "uncertain",
      reason:
        `Expo returned HTTP ${response.status}; ` +
        "delivery acceptance could not be confirmed.",
    };
  }

  let result: {
    data?: {
      status?: unknown;
      id?: unknown;
      message?: unknown;
    };
  };

  try {
    result = await response.json();
  } catch {
    return {
      kind: "uncertain",
      reason: "Expo response could not be decoded.",
    };
  }

  const ticket = result?.data;

  if (ticket?.status === "ok") {
    return {
      kind: "accepted",
      ticketId:
        typeof ticket.id === "string"
          ? ticket.id
          : null,
    };
  }

  if (ticket?.status === "error") {
    return {
      kind: "rejected",
      reason:
        typeof ticket.message === "string"
          ? ticket.message
          : "Expo rejected the notification.",
    };
  }

  return {
    kind: "uncertain",
    reason: "Expo returned an unrecognized delivery response.",
  };
}

// Record the outcome against the existing scheduled campaign.
// Never reset a claimed campaign to "scheduled" for another attempt.
async function recordScheduledTestDeliveryResult(
  client: SupabaseAdminClient,
  delivery: VerifiedTestDelivery,
  result: ExpoDeliveryResult
): Promise<void> {
  const updatedAt = new Date().toISOString();

  const updates = result.kind === "accepted"
    ? {
        status: "sent",
        accepted_count: 1,
        failed_count: 0,
        sent_at: updatedAt,
        last_error: null,
        updated_at: updatedAt,
      }
    : result.kind === "rejected"
      ? {
          status: "failed",
          accepted_count: 0,
          failed_count: 1,
          last_error: (
            "Expo rejected the notification: " + result.reason
          ).slice(0, 1000),
          updated_at: updatedAt,
        }
      : {
          status: "failed",
          accepted_count: 0,
          failed_count: 0,
          last_error: (
            "Delivery outcome unconfirmed. Do not retry automatically. " +
            result.reason
          ).slice(0, 1000),
          updated_at: updatedAt,
        };

  const { data, error } = await client
    .from("notification_campaigns")
    .update(updates)
    .eq("id", delivery.campaignId)
    .eq("audience", "test")
    .eq("status", "sending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to record scheduled delivery outcome: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Claimed campaign is no longer available for outcome recording."
    );
  }
}

// Recover interrupted scheduled tests without resending them.
// This is called only after worker authentication and enablement.
async function recoverStaleScheduledTests(
  client: SupabaseAdminClient
): Promise<number> {
  const { data, error } = await client.rpc(
    "mark_stale_scheduled_tests_unconfirmed"
  );

  if (error) {
    throw new Error(
      `Unable to recover interrupted tests: ${error.message}`
    );
  }

  if (
    typeof data !== "number" ||
    !Number.isInteger(data) ||
    data < 0
  ) {
    throw new Error("Invalid scheduled recovery result.");
  }

  return data;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed." },
        { status: 405 }
      );
    }

    const configuredSecret =
      Deno.env.get(WORKER_SECRET_NAME)?.trim();

    if (!configuredSecret || configuredSecret.length < 32) {
      console.error("Scheduled worker authentication is not configured.");

      return Response.json(
        { error: "Worker unavailable." },
        { status: 503 }
      );
    }

    const suppliedSecret =
      request.headers.get(WORKER_SECRET_HEADER) ?? "";

    if (
      !suppliedSecret ||
      !(await secretsMatch(suppliedSecret, configuredSecret))
    ) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Delivery is disabled unless explicitly enabled.
    // The secret alone never authorizes sending.
    if (
      Deno.env.get("SCHEDULED_TEST_DELIVERY_ENABLED") !== "true"
    ) {
      return Response.json(
        { error: "Scheduled delivery is not enabled." },
        { status: 503 }
      );
    }

    // General claims require separate, explicit authorization.
    // Until then, every enabled request must specify one campaign.
    const targetCampaignId = (
      request.headers.get("x-scheduled-test-campaign-id") ?? ""
    ).trim().toLowerCase();

    if (
      targetCampaignId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        targetCampaignId
      )
    ) {
      return Response.json(
        { error: "Invalid target campaign identifier." },
        { status: 400 }
      );
    }

    if (
      !targetCampaignId &&
      Deno.env.get("SCHEDULED_TEST_ALLOW_GENERAL_CLAIMS") !== "true"
    ) {
      return Response.json(
        { error: "Target campaign required." },
        { status: 400 }
      );
    }

    try {
      const client = createAdminClient();

      // Targeted tests must not modify other campaigns.
      const recovered = targetCampaignId
        ? 0
        : await recoverStaleScheduledTests(client);

      // Exactly one claim attempt, with no fallback or retry.
      const campaignId = targetCampaignId
        ? await claimSpecificDueTestCampaign(client, targetCampaignId)
        : await claimNextDueTestCampaign(client);

      if (!campaignId) {
        return Response.json({
          success: true,
          processed: 0,
          recovered,
        });
      }

      let verification: VerificationResult;

      try {
        verification = await verifyClaimedTestDelivery(
          client,
          campaignId
        );
      } catch (error) {
        // No Expo request has occurred at this point.
        console.error(
          "Scheduled test verification failed:",
          error
        );

        await markClaimedTestNotSent(
          client,
          campaignId,
          "Unable to verify the scheduled test. No Expo request was made."
        );

        return Response.json(
          { error: "Unable to verify scheduled test." },
          { status: 500 }
        );
      }

      if (!verification.ok) {
        await markClaimedTestNotSent(
          client,
          campaignId,
          verification.reason
        );

        return Response.json({
          success: true,
          processed: 1,
          result: "not_sent",
        });
      }

      // Exactly one Expo request is attempted.
      const deliveryResult = await sendScheduledTestToExpo(
        verification.delivery
      );

      // Recording errors are surfaced, never retried.
      await recordScheduledTestDeliveryResult(
        client,
        verification.delivery,
        deliveryResult
      );

      return Response.json({
        success: true,
        processed: 1,
        result: deliveryResult.kind,
      });
    } catch (error) {
      console.error(
        "Scheduled test processing failed:",
        error
      );

      // Never retry a claimed campaign automatically.
      return Response.json(
        { error: "Scheduled test processing failed." },
        { status: 500 }
      );
    }
  },
};
