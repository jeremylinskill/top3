// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase(
    {
      auth: "user",
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

      const userId =
        ctx.userClaims?.id;

      if (!userId) {
        return Response.json(
          {
            error:
              "Authenticated user not found.",
          },
          {
            status: 401,
          }
        );
      }

      const { error } =
        await ctx.supabaseAdmin.auth.admin.deleteUser(
          userId
        );

      if (error) {
        console.error(
          "Failed to delete account:",
          error
        );

        return Response.json(
          {
            error:
              "Failed to delete account.",
          },
          {
            status: 500,
          }
        );
      }

      return Response.json({
        success: true,
      });
    }
  ),
};
