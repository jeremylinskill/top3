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
          title: string;
          message: string;
          category_id: string;
          destination_kind: DestinationKind;
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
        Insert: Record<string, never>;
        Update: Record<string, never>;
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
        body.action !== "list"
      ) {
        return Response.json(
          { error: "Unsupported campaign action." },
          { status: 400 }
        );
      }

      const campaignAdmin =
        ctx.supabaseAdmin as unknown as
          SupabaseClient<CampaignHistoryDatabase>;

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
