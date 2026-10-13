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
          target_push_token_id: string | null;
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
          scheduled_at?: string | null;
          target_push_token_id?: string | null;
          updated_at?: string;
        };
        Update: {
          audience?: CampaignAudience;
          title?: string | null;
          message?: string | null;
          category_id?: string | null;
          destination_kind?: DestinationKind | null;
          option_id?: string | null;
          status?: CampaignStatus;
          scheduled_at?: string | null;
          target_push_token_id?: string | null;
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
        body.action !== "save-draft" &&
        body.action !== "schedule" &&
        body.action !== "cancel" &&
        body.action !== "edit-scheduled" &&
        body.action !== "reschedule"
      ) {
        return Response.json(
          { error: "Unsupported campaign action." },
          { status: 400 }
        );
      }

      const campaignAdmin =
        ctx.supabaseAdmin as unknown as
          SupabaseClient<CampaignHistoryDatabase>;


      if (body.action === "schedule") {
        const payload = body as Record<string, unknown>;
        const invalid = (message: string) =>
          Response.json({ error: message }, { status: 400 });

        if (
          typeof payload.title !== "string" ||
          typeof payload.message !== "string"
        ) {
          return invalid("Notification title and message are required.");
        }

        const title = payload.title.trim();
        const message = payload.message.trim();

        if (
          !title || title.length > 100 ||
          !message || message.length > 220
        ) {
          return invalid("Invalid notification title or message.");
        }

        const rawScheduledAt = payload.scheduledAt;

        if (
          typeof rawScheduledAt !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
            rawScheduledAt
          )
        ) {
          return invalid("A UTC scheduling time is required.");
        }

        const scheduledDate = new Date(rawScheduledAt);

        if (
          !Number.isFinite(scheduledDate.getTime()) ||
          scheduledDate.toISOString() !== rawScheduledAt ||
          scheduledDate.getTime() <= Date.now() + 60000
        ) {
          return invalid("Choose a valid future scheduling time.");
        }

        const draftId = payload.id;

        if (
          typeof draftId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            draftId
          )
        ) {
          return invalid("A valid saved draft is required.");
        }

        const rawDestination = payload.destination;

        if (
          !rawDestination ||
          typeof rawDestination !== "object" ||
          Array.isArray(rawDestination)
        ) {
          return invalid("A destination is required.");
        }

        const destination =
          rawDestination as Record<string, unknown>;
        const categoryId = destination.categoryId;
        const kind = destination.kind;
        const rawOptionId = destination.optionId;

        if (
          typeof categoryId !== "string" ||
          ![
            "albums", "artists", "books", "games",
            "movies", "songs", "tv"
          ].includes(categoryId) ||
          (kind !== "overall" &&
           kind !== "type" &&
           kind !== "theme")
        ) {
          return invalid("Invalid notification destination.");
        }

        let optionId: string | null = null;

        if (kind === "overall") {
          if (rawOptionId !== null && rawOptionId !== undefined) {
            return invalid("Overall destinations cannot have options.");
          }
        } else {
          if (
            typeof rawOptionId !== "string" ||
            !/^[a-zA-Z0-9_-]{1,128}$/.test(rawOptionId)
          ) {
            return invalid("Invalid destination option.");
          }

          const { data: matchedOption, error: optionError } =
            await ctx.supabaseAdmin
              .from("collection_options")
              .select("id")
              .eq("id", rawOptionId)
              .eq("category_id", categoryId)
              .eq("kind", kind)
              .eq("active", true)
              .maybeSingle();

          if (optionError) {
            console.error(
              "Scheduling destination verification failed:",
              optionError.message
            );
            return Response.json(
              { error: "Unable to verify destination." },
              { status: 500 }
            );
          }

          if (!matchedOption) {
            return invalid("Destination is no longer available.");
          }

          optionId = rawOptionId;
        }

        const rawToken = payload.expoPushToken;

        if (
          typeof rawToken !== "string" ||
          rawToken.trim().length > 300 ||
          !/^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/.test(
            rawToken.trim()
          )
        ) {
          return invalid("A valid test device is required.");
        }

        const { data: device, error: deviceError } =
          await ctx.supabaseAdmin
            .from("push_tokens")
            .select("id")
            .eq("user_id", userId)
            .eq("expo_push_token", rawToken.trim())
            .maybeSingle();

        if (deviceError) {
          console.error(
            "Scheduling device verification failed:",
            deviceError.message
          );
          return Response.json(
            { error: "Unable to verify test device." },
            { status: 500 }
          );
        }

        const verifiedDevice = device as { id: string } | null;

        if (!verifiedDevice) {
          return Response.json(
            { error: "Test device is not registered." },
            { status: 403 }
          );
        }

        const scheduledAt = scheduledDate.toISOString();
        const scheduledFields = {
          title,
          message,
          category_id: categoryId,
          destination_kind: kind as DestinationKind,
          option_id: optionId,
          audience: "test" as const,
          status: "scheduled" as const,
          scheduled_at: scheduledAt,
          target_push_token_id: verifiedDevice.id,
          updated_at: new Date().toISOString(),
        };

        const { data: updated, error: updateError } =
          await campaignAdmin
            .from("notification_campaigns")
            .update(scheduledFields)
            .eq("id", draftId)
            .eq("status", "draft")
            .eq("created_by", userId)
            .select("id")
            .maybeSingle();

        if (updateError) {
          console.error(
            "Unable to schedule draft:",
            updateError.message
          );
          return Response.json(
            { error: "Unable to schedule notification." },
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
          scheduledAt,
        });

      }

      if (body.action === "edit-scheduled") {
        const payload = body as Record<string, unknown>;

        const invalid = (message: string) =>
          Response.json({ error: message }, { status: 400 });

        const campaignId = payload.id;

        if (
          typeof campaignId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            campaignId
          )
        ) {
          return invalid("Invalid campaign identifier.");
        }

        if (
          typeof payload.title !== "string" ||
          typeof payload.message !== "string"
        ) {
          return invalid(
            "Notification title and message are required."
          );
        }

        const title = payload.title.trim();
        const message = payload.message.trim();

        if (
          !title ||
          title.length > 100 ||
          !message ||
          message.length > 220
        ) {
          return invalid(
            "Invalid notification title or message."
          );
        }

        const rawScheduledAt = payload.scheduledAt;

        if (
          typeof rawScheduledAt !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
            rawScheduledAt
          )
        ) {
          return invalid("A UTC scheduling time is required.");
        }

        const scheduledDate = new Date(rawScheduledAt);

        if (
          !Number.isFinite(scheduledDate.getTime()) ||
          scheduledDate.toISOString() !== rawScheduledAt ||
          scheduledDate.getTime() <= Date.now() + 60000
        ) {
          return invalid(
            "Choose a valid future scheduling time."
          );
        }

        const rawDestination = payload.destination;

        if (
          !rawDestination ||
          typeof rawDestination !== "object" ||
          Array.isArray(rawDestination)
        ) {
          return invalid("A destination is required.");
        }

        const destination =
          rawDestination as Record<string, unknown>;

        const categoryId = destination.categoryId;
        const kind = destination.kind;
        const rawOptionId = destination.optionId;

        if (
          typeof categoryId !== "string" ||
          ![
            "albums",
            "artists",
            "books",
            "games",
            "movies",
            "songs",
            "tv",
          ].includes(categoryId) ||
          (
            kind !== "overall" &&
            kind !== "type" &&
            kind !== "theme"
          )
        ) {
          return invalid("Invalid notification destination.");
        }

        let optionId: string | null = null;

        if (kind === "overall") {
          if (
            rawOptionId !== null &&
            rawOptionId !== undefined
          ) {
            return invalid(
              "Overall destinations cannot have options."
            );
          }
        } else {
          if (
            typeof rawOptionId !== "string" ||
            !/^[a-zA-Z0-9_-]{1,128}$/.test(rawOptionId)
          ) {
            return invalid("Invalid destination option.");
          }

          const { data: matchedOption, error: optionError } =
            await ctx.supabaseAdmin
              .from("collection_options")
              .select("id")
              .eq("id", rawOptionId)
              .eq("category_id", categoryId)
              .eq("kind", kind)
              .eq("active", true)
              .maybeSingle();

          if (optionError) {
            console.error(
              "Scheduled edit destination verification failed:",
              optionError.message
            );

            return Response.json(
              { error: "Unable to verify destination." },
              { status: 500 }
            );
          }

          if (!matchedOption) {
            return invalid(
              "Destination is no longer available."
            );
          }

          optionId = rawOptionId;
        }

        // Update content and delivery time atomically.
        // The target device, audience and status stay unchanged.
        // The conditional update prevents editing after
        // the delivery worker claims the notification.
        const { data: updated, error: updateError } =
          await campaignAdmin
            .from("notification_campaigns")
            .update({
              title,
              message,
              category_id: categoryId,
              destination_kind: kind as DestinationKind,
              option_id: optionId,
              scheduled_at: scheduledDate.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", campaignId)
            .eq("created_by", userId)
            .eq("audience", "test")
            .eq("status", "scheduled")
            .select("id")
            .maybeSingle();

        if (updateError) {
          console.error(
            "Unable to edit scheduled notification:",
            updateError.message
          );

          return Response.json(
            {
              error:
                "Unable to save scheduled notification changes.",
            },
            { status: 500 }
          );
        }

        if (!updated) {
          return Response.json(
            {
              error:
                "Scheduled notification not found or no longer editable.",
            },
            { status: 404 }
          );
        }

        return Response.json({
          success: true,
          campaignId: updated.id,
        });
      }

      if (body.action === "reschedule") {
        const payload = body as Record<string, unknown>;
        const campaignId = payload.id;
        const rawScheduledAt = payload.scheduledAt;

        if (
          typeof campaignId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            campaignId
          )
        ) {
          return Response.json(
            { error: "Invalid campaign identifier." },
            { status: 400 }
          );
        }

        if (
          typeof rawScheduledAt !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
            rawScheduledAt
          )
        ) {
          return Response.json(
            { error: "A UTC scheduling time is required." },
            { status: 400 }
          );
        }

        const scheduledDate = new Date(rawScheduledAt);

        if (
          !Number.isFinite(scheduledDate.getTime()) ||
          scheduledDate.toISOString() !== rawScheduledAt ||
          scheduledDate.getTime() <= Date.now() + 60000
        ) {
          return Response.json(
            { error: "Choose a valid future scheduling time." },
            { status: 400 }
          );
        }

        const scheduledAt = scheduledDate.toISOString();

        // Conditional status and ownership checks prevent
        // rescheduling after a worker claims the campaign.
        const { data: updated, error: updateError } =
          await campaignAdmin
            .from("notification_campaigns")
            .update({
              scheduled_at: scheduledAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", campaignId)
            .eq("created_by", userId)
            .eq("audience", "test")
            .eq("status", "scheduled")
            .select("id")
            .maybeSingle();

        if (updateError) {
          console.error(
            "Unable to reschedule notification:",
            updateError.message
          );

          return Response.json(
            { error: "Unable to reschedule notification." },
            { status: 500 }
          );
        }

        if (!updated) {
          return Response.json(
            {
              error:
                "Scheduled notification not found or no longer editable.",
            },
            { status: 404 }
          );
        }

        return Response.json({
          success: true,
          campaignId: updated.id,
          scheduledAt,
        });
      }

      if (body.action === "cancel") {
        const payload = body as Record<string, unknown>;
        const campaignId = payload.id;

        if (
          typeof campaignId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            campaignId
          )
        ) {
          return Response.json(
            { error: "Invalid campaign identifier." },
            { status: 400 }
          );
        }

        // A conditional update prevents cancellation after
        // a worker has claimed the scheduled campaign.
        const { data: cancelled, error: cancelError } =
          await campaignAdmin
            .from("notification_campaigns")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", campaignId)
            .eq("created_by", userId)
            .eq("audience", "test")
            .eq("status", "scheduled")
            .select("id")
            .maybeSingle();

        if (cancelError) {
          console.error(
            "Unable to cancel notification:",
            cancelError.message
          );

          return Response.json(
            { error: "Unable to cancel notification." },
            { status: 500 }
          );
        }

        if (!cancelled) {
          return Response.json(
            {
              error:
                "Scheduled notification not found or no longer cancellable.",
            },
            { status: 404 }
          );
        }

        return Response.json({
          success: true,
          campaignId: cancelled.id,
        });
      }

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

      const campaignFields =
        "id,title,message,category_id,destination_kind,option_id,audience,status,scheduled_at,started_at,sent_at,target_count,accepted_count,failed_count,last_error,created_at,updated_at" as const;

      // Read active campaigns in pages to avoid silently
      // losing older drafts or scheduled notifications.
      const activeCampaigns: Array<{
        id: string;
        created_at: string;
        [key: string]: unknown;
      }> = [];

      const pageSize = 100;
      let offset = 0;

      while (true) {
        const { data, error } = await campaignAdmin
          .from("notification_campaigns")
          .select(campaignFields)
          .in("status", ["draft", "scheduled"])
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error(
            "Unable to retrieve active campaigns:",
            error.message
          );
          return Response.json(
            { error: "Unable to load notification history." },
            { status: 500 }
          );
        }

        if (!data?.length) {
          break;
        }

        activeCampaigns.push(...data);
        offset += data.length;
      }

      // Completed campaigns retain the existing history limit.
      const { data: history, error: historyError } =
        await campaignAdmin
          .from("notification_campaigns")
          .select(campaignFields)
          .in("status", [
            "sending", "sent", "failed", "cancelled"
          ])
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(HISTORY_LIMIT);

      if (historyError) {
        console.error(
          "Unable to retrieve notification history:",
          historyError.message
        );
        return Response.json(
          { error: "Unable to load notification history." },
          { status: 500 }
        );
      }

      const campaigns = [
        ...activeCampaigns,
        ...(history ?? []),
      ].sort((a, b) => {
        const aSortDate =
          a.status === "draft" || a.status === "scheduled"
            ? a.created_at
            : typeof a.updated_at === "string"
              ? a.updated_at
              : a.created_at;

        const bSortDate =
          b.status === "draft" || b.status === "scheduled"
            ? b.created_at
            : typeof b.updated_at === "string"
              ? b.updated_at
              : b.created_at;

        const dateOrder = bSortDate.localeCompare(aSortDate);

        return dateOrder !== 0
          ? dateOrder
          : b.id.localeCompare(a.id);
      });

      return Response.json({
        success: true,
        campaigns,
      });
    }
  ),
};
