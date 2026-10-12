import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import type { SupabaseClient } from "npm:@supabase/supabase-js@^2";

const HISTORY_LIMIT = 50;

type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

type CampaignAudience = "test" | "all";
type DestinationKind = "overall" | "type" | "theme";

type CampaignHistoryDatabase = {
  public: {
    Tables: {
      notification_campaigns: {
        Row: {
          id: string;
          created_by: string | null;
          title: string | null;
          message: string | null;
          category_id: string | null;
          destination_kind: DestinationKind | null;
          option_id: string | null;
          audience: CampaignAudience;
          status: CampaignStatus;
          scheduled_at: string | null;
          started_at: string | null;
          sent_at: string | null;
          target_count: number;
          accepted_count: number;
          failed_count: number;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          created_by?: string | null;
          title?: string | null;
          message?: string | null;
          category_id?: string | null;
          destination_kind?: DestinationKind | null;
          option_id?: string | null;
          audience?: CampaignAudience;
          status?: CampaignStatus;
          updated_at?: string;
        };
        Update: {
          title?: string | null;
          message?: string | null;
          category_id?: string | null;
          destination_kind?: DestinationKind | null;
          option_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
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

      // Administrator privileges are checked on the
      // server, never trusted from the client.
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

      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Invalid request." },
          { status: 400 }
        );
      }

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        !("action" in body) ||
        body.action !== "list" &&
        body.action !== "save-draft"
      ) {
        return Response.json(
          { error: "Unsupported campaign action." },
          { status: 400 }
        );
      }

      const campaignAdmin =
        ctx.supabaseAdmin as unknown as
          SupabaseClient<CampaignHistoryDatabase>;

      if (body.action === "save-draft") {
        const payload = body as Record<string, unknown>;
        const invalid = (message: string) =>
          Response.json({ error: message }, { status: 400 });

        if (
          typeof payload.title !== "string" ||
          typeof payload.message !== "string"
        ) {
          return invalid("Draft title and message must be text.");
        }

        const title = payload.title.trim();
        const message = payload.message.trim();

        if (title.length > 100 || message.length > 220) {
          return invalid("Draft title or message is too long.");
        }

        const rawId = payload.id;
        let draftId: string | null = null;

        if (rawId !== undefined && rawId !== null) {
          if (
            typeof rawId !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              rawId
            )
          ) {
            return invalid("Invalid draft identifier.");
          }

          draftId = rawId;
        }

        let categoryId: string | null = null;
        let destinationKind: DestinationKind | null = null;
        let optionId: string | null = null;

        if (payload.destination !== null) {
          const rawDestination = payload.destination;

          if (
            !rawDestination ||
            typeof rawDestination !== "object" ||
            Array.isArray(rawDestination)
          ) {
            return invalid("Invalid draft destination.");
          }

          const destination =
            rawDestination as Record<string, unknown>;

          const category = destination.categoryId;
          const kind = destination.kind;
          const option = destination.optionId;

          if (
            typeof category !== "string" ||
            ![
              "albums",
              "artists",
              "books",
              "games",
              "movies",
              "songs",
              "tv",
            ].includes(category) ||
            (
              kind !== "overall" &&
              kind !== "type" &&
              kind !== "theme"
            )
          ) {
            return invalid("Invalid draft destination.");
          }

          if (kind === "overall") {
            if (option !== null && option !== undefined) {
              return invalid("Overall destinations cannot have options.");
            }
          } else {
            if (
              typeof option !== "string" ||
              option.trim().length < 1 ||
              option.trim().length > 128
            ) {
              return invalid("Invalid draft destination option.");
            }

            optionId = option.trim();
          }

          categoryId = category;
          destinationKind = kind;
        }

        const draftFields = {
          title,
          message,
          category_id: categoryId,
          destination_kind: destinationKind,
          option_id: optionId,
          updated_at: new Date().toISOString(),
        };

        if (draftId) {
          // The status guard prevents editing sent, scheduled,
          // cancelled, or currently sending campaigns.
          const { data: updated, error: updateError } =
            await campaignAdmin
              .from("notification_campaigns")
              .update(draftFields)
              .eq("id", draftId)
              .eq("status", "draft")
              .eq("created_by", userId)
              .select("id")
              .maybeSingle();

          if (updateError) {
            console.error(
              "Unable to update notification draft:",
              updateError.message
            );

            return Response.json(
              { error: "Unable to save notification draft." },
              { status: 500 }
            );
          }

          if (!updated) {
            return Response.json(
              { error: "Draft not found or no longer editable." },
              { status: 404 }
            );
          }

          return Response.json({
            success: true,
            campaignId: updated.id,
          });
        }

        const { data: created, error: createError } =
          await campaignAdmin
            .from("notification_campaigns")
            .insert({
              ...draftFields,
              created_by: userId,
              audience: "test",
              status: "draft",
            })
            .select("id")
            .single();

        if (createError || !created) {
          console.error(
            "Unable to create notification draft:",
            createError?.message ?? "No campaign returned."
          );

          return Response.json(
            { error: "Unable to save notification draft." },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          campaignId: created.id,
        });
      }

      const { data: campaigns, error } =
        await campaignAdmin
          .from("notification_campaigns")
          .select(
            "id,title,message,category_id," +
            "destination_kind,option_id,audience,status," +
            "scheduled_at,started_at,sent_at," +
            "target_count,accepted_count,failed_count," +
            "last_error,created_at,updated_at"
          )
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(HISTORY_LIMIT);

      if (error) {
        console.error(
          "Unable to retrieve notification history:",
          error.message
        );

        return Response.json(
          { error: "Unable to load notification history." },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        campaigns: campaigns ?? [],
      });
    }
  ),
};
