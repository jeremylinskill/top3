import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import type { SupabaseClient } from "npm:@supabase/supabase-js@^2";

const ROLES = new Set([
  "vocalist",
  "guitarist",
  "drummer",
  "bassist",
  "mc",
  "dj",
]);

const ROLE_LABELS: Record<string, string> = {
  vocalist: "Vocalist",
  guitarist: "Guitarist",
  drummer: "Drummer",
  bassist: "Bassist",
  mc: "MC",
  dj: "DJ",
};

const MAX_SUGGESTIONS_PER_DAY = 5;

const MUSICIAN_SUGGESTION_REVIEW_URL =
  Deno.env.get("MUSICIAN_SUGGESTION_REVIEW_URL")?.trim();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


async function sendNotification({
  musicianName,
  role,
  knownFor,
  userId,
}: {
  musicianName: string;
  role: string;
  knownFor: string | null;
  userId: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const recipient = Deno.env.get(
    "MUSICIAN_SUGGESTION_NOTIFY_EMAIL"
  );
  const sender = Deno.env.get(
    "MUSICIAN_SUGGESTION_FROM_EMAIL"
  );

  if (
    !apiKey ||
    !recipient ||
    !sender ||
    !MUSICIAN_SUGGESTION_REVIEW_URL
  ) {
    throw new Error(
      "Musician suggestion email is not configured."
    );
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: "Top 3 — New Musician Suggestion",
        text: [
          "A new musician has been suggested for Top 3.",
          "",
          `Musician: ${musicianName}`,
          `Category: ${ROLE_LABELS[role]}`,
          `Known for: ${knownFor || "Not provided"}`,
          `Submitted by user ID: ${userId}`,
          "",
          `Review this suggestion in DEV Supabase: ${MUSICIAN_SUGGESTION_REVIEW_URL}`,
        ].join("\n"),
        html: [
          '<div style="font-family: Arial, sans-serif; line-height: 1.6;">',
          "<p>A new musician has been suggested for Top 3.</p>",
          `<p><strong>Musician:</strong> ${escapeHtml(musicianName)}<br>`,
          `<strong>Category:</strong> ${escapeHtml(ROLE_LABELS[role])}<br>`,
          `<strong>Known for:</strong> ${escapeHtml(knownFor || "Not provided")}<br>`,
          `<strong>Submitted by user ID:</strong> ${escapeHtml(userId)}</p>`,
          `<p><a href="${MUSICIAN_SUGGESTION_REVIEW_URL}">Review this suggestion in DEV Supabase</a>.</p>`,
          "</div>",
        ].join(""),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Email provider returned HTTP ${response.status}`
    );
  }
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (request, ctx) => {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Method not allowed." },
          { status: 405 }
        );
      }

      const userId = ctx.userClaims?.id;
      // The new table is not yet in generated database types.
      const admin = ctx.supabaseAdmin as unknown as SupabaseClient;

      if (!userId) {
        return Response.json(
          { error: "Sign in to suggest a musician." },
          { status: 401 }
        );
      }

      let body: Record<string, unknown>;

      try {
        const parsed: unknown = await request.json();

        if (
          !parsed ||
          typeof parsed !== "object" ||
          Array.isArray(parsed)
        ) {
          throw new Error("Invalid body");
        }

        body = parsed as Record<string, unknown>;
      } catch {
        return Response.json(
          { error: "Invalid request." },
          { status: 400 }
        );
      }

      if (
        typeof body.name !== "string" ||
        typeof body.role !== "string" ||
        (
          body.knownFor != null &&
          typeof body.knownFor !== "string"
        )
      ) {
        return Response.json(
          { error: "Invalid suggestion details." },
          { status: 400 }
        );
      }

      const name = body.name.trim();
      const role = body.role;
      const knownFor =
        typeof body.knownFor === "string"
          ? body.knownFor.trim()
          : "";

      if (
        name.length < 1 ||
        name.length > 120 ||
        !ROLES.has(role) ||
        knownFor.length > 300
      ) {
        return Response.json(
          { error: "Invalid suggestion details." },
          { status: 400 }
        );
      }

      const since = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const { count, error: countError } =
        await admin
          .from("musician_suggestions")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("submitted_by", userId)
          .gte("created_at", since);

      if (countError) {
        console.error(
          "Musician suggestion rate-check failed:",
          countError.message
        );

        return Response.json(
          { error: "Please try again later." },
          { status: 503 }
        );
      }

      if ((count ?? 0) >= MAX_SUGGESTIONS_PER_DAY) {
        return Response.json(
          {
            error:
              "You've reached today's suggestion limit. Please try again tomorrow.",
          },
          { status: 429 }
        );
      }

      const { data, error: insertError } =
        await admin
          .from("musician_suggestions")
          .insert({
            submitted_by: userId,
            musician_name: name,
            role,
            known_for: knownFor || null,
          })
          .select("id")
          .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return Response.json({
            success: true,
            alreadySubmitted: true,
          });
        }

        console.error(
          "Musician suggestion insert failed:",
          insertError.message
        );

        return Response.json(
          { error: "Unable to save suggestion." },
          { status: 500 }
        );
      }

      let notificationStatus = "sent";

      try {
        await sendNotification({
          musicianName: name,
          role,
          knownFor: knownFor || null,
          userId,
        });
      } catch (error) {
        notificationStatus = "failed";
        console.error(
          "Musician suggestion email failed:",
          error instanceof Error
            ? error.message
            : "Unknown email error"
        );
      }

      const { error: updateError } =
        await admin
          .from("musician_suggestions")
          .update({
            notification_status: notificationStatus,
            notification_sent_at:
              notificationStatus === "sent"
                ? new Date().toISOString()
                : null,
          })
          .eq("id", data.id);

      if (updateError) {
        console.error(
          "Musician suggestion notification status update failed:",
          updateError.message
        );
      }

      return Response.json({
        success: true,
        alreadySubmitted: false,
      });
    }
  ),
};
