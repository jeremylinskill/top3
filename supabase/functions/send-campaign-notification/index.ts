import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const EXPO_PUSH_URL =
  "https://exp.host/--/api/v2/push/send";

const MAX_TITLE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 220;

type CampaignRequest = {
  action?: unknown;
  title?: unknown;
  message?: unknown;
  destination?: unknown;
  expoPushToken?: unknown;
};

type ExpoPushTicket = {
  status?: string;
  id?: string;
  message?: string;
};

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

      if (!userId) {
        return Response.json(
          { error: "Authentication required." },
          { status: 401 }
        );
      }

      // Admin access must be verified on the server.
      const { data: profile, error: profileError } =
        await ctx.supabaseAdmin
          .from("profiles")
          .select("is_admin")
          .eq("id", userId)
          .maybeSingle();

      if (profileError) {
        console.error(
          "Campaign admin verification failed:",
          profileError.message
        );

        return Response.json(
          { error: "Unable to verify administrator access." },
          { status: 500 }
        );
      }

      const adminProfile = profile as
        | { is_admin: boolean }
        | null;

      if (!adminProfile?.is_admin) {
        return Response.json(
          { error: "Administrator access required." },
          { status: 403 }
        );
      }

      let body: CampaignRequest;

      try {
        body = await request.json();

        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body)
        ) {
          throw new Error("Invalid body");
        }
      } catch {
        return Response.json(
          { error: "Invalid request." },
          { status: 400 }
        );
      }

      // Broadcasting is deliberately not implemented yet.
      if (body.action !== "test") {
        return Response.json(
          { error: "Only test notifications are currently supported." },
          { status: 403 }
        );
      }

      const {
        title,
        message,
        destination,
        expoPushToken,
      } = body;

      if (
        typeof title !== "string" ||
        typeof message !== "string" ||
        typeof expoPushToken !== "string" ||
        !destination ||
        typeof destination !== "object" ||
        Array.isArray(destination)
      ) {
        return Response.json(
          { error: "Invalid notification details." },
          { status: 400 }
        );
      }

      const details = destination as Record<string, unknown>;
      const categoryId = details.categoryId;
      const kind = details.kind;
      const optionId = details.optionId;

      const cleanTitle = title.trim();
      const cleanMessage = message.trim();
      const cleanToken = expoPushToken.trim();

      const supportedCategories = [
        "albums",
        "artists",
        "books",
        "games",
        "movies",
        "songs",
        "tv",
      ];

      const validCategory =
        typeof categoryId === "string" &&
        supportedCategories.includes(categoryId);

      const validOptionId =
        typeof optionId === "string" &&
        /^[a-zA-Z0-9_-]{1,128}$/.test(optionId);

      const validDestination =
        kind === "overall"
          ? optionId === undefined
          : (kind === "type" || kind === "theme") &&
            validOptionId;

      if (
        !cleanTitle ||
        cleanTitle.length > MAX_TITLE_LENGTH ||
        !cleanMessage ||
        cleanMessage.length > MAX_MESSAGE_LENGTH ||
        !validCategory ||
        !validDestination ||
        cleanToken.length > 300 ||
        !/^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/.test(
          cleanToken
        )
      ) {
        return Response.json(
          { error: "Invalid notification details." },
          { status: 400 }
        );
      }

      let cleanDestination:
        | { categoryId: string; kind: "overall" }
        | {
            categoryId: string;
            kind: "type" | "theme";
            optionId: string;
          };

      if (kind === "overall") {
        cleanDestination = {
          categoryId: categoryId as string,
          kind: "overall",
        };
      } else {
        const cleanOptionId = optionId as string;
        const cleanKind = kind as "type" | "theme";

        const {
          data: matchedOption,
          error: optionError,
        } = await ctx.supabaseAdmin
          .from("collection_options")
          .select("id")
          .eq("id", cleanOptionId)
          .eq("category_id", categoryId as string)
          .eq("kind", cleanKind)
          .eq("active", true)
          .maybeSingle();

        if (optionError) {
          console.error(
            "Campaign destination verification failed:",
            optionError.message
          );

          return Response.json(
            { error: "Unable to verify destination." },
            { status: 500 }
          );
        }

        if (!matchedOption) {
          return Response.json(
            { error: "Destination is not available." },
            { status: 400 }
          );
        }

        cleanDestination = {
          categoryId: categoryId as string,
          kind: cleanKind,
          optionId: cleanOptionId,
        };
      }

      // A test can only target a device registered
      // to the authenticated administrator.
      const { data: registeredToken, error: tokenError } =
        await ctx.supabaseAdmin
          .from("push_tokens")
          .select("id")
          .eq("user_id", userId)
          .eq("expo_push_token", cleanToken)
          .maybeSingle();

      if (tokenError) {
        console.error(
          "Campaign token verification failed:",
          tokenError.message
        );

        return Response.json(
          { error: "Unable to verify test device." },
          { status: 500 }
        );
      }

      if (!registeredToken) {
        return Response.json(
          {
            error:
              "This device is not registered for push notifications.",
          },
          { status: 403 }
        );
      }

      let ticket: ExpoPushTicket;

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: cleanToken,
            sound: "default",
            title: cleanTitle,
            body: cleanMessage,
            data: {
              type: "top3_campaign",
              destination: cleanDestination,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Expo returned HTTP ${response.status}`
          );
        }

        const result = await response.json();
        ticket = result?.data;

        if (ticket?.status !== "ok") {
          throw new Error(
            ticket?.message ||
              "Expo did not accept the notification."
          );
        }
      } catch (error) {
        console.error(
          "Campaign test push failed:",
          error instanceof Error
            ? error.message
            : "Unknown error"
        );

        return Response.json(
          { error: "Unable to send test notification." },
          { status: 502 }
        );
      }

      return Response.json({
        success: true,
        action: "test",
        accepted: 1,
        ticketId: ticket.id ?? null,
      });
    }
  ),
};
