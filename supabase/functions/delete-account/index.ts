// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  importPKCS8,
  SignJWT,
} from "npm:jose@5.9.6";

const AVATARS_BUCKET = "avatars";

const APPLE_REVOKE_URL =
  "https://appleid.apple.com/auth/revoke";

const AMPLITUDE_PRIVACY_URL =
  "https://amplitude.com/api/2/deletions/users";

type AppleAuthTokenRow = {
  refresh_token: string;
};

function getRequiredSecret(
  name: string
): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(
      `Missing required secret: ${name}`
    );
  }

  return value;
}

function decodePrivateKey(
  encodedKey: string
): string {
  const binaryValue =
    atob(encodedKey);

  const bytes =
    Uint8Array.from(
      binaryValue,
      (character) =>
        character.charCodeAt(0)
    );

  return new TextDecoder().decode(bytes);
}

async function createAppleClientSecret() {
  const teamId =
    getRequiredSecret("APPLE_TEAM_ID");

  const keyId =
    getRequiredSecret("APPLE_KEY_ID");

  const clientId =
    getRequiredSecret("APPLE_CLIENT_ID");

  const privateKeyPem =
    decodePrivateKey(
      getRequiredSecret(
        "APPLE_PRIVATE_KEY_B64"
      )
    );

  const privateKey =
    await importPKCS8(
      privateKeyPem,
      "ES256"
    );

  const now =
    Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: keyId,
    })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience(
      "https://appleid.apple.com"
    )
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(privateKey);
}

async function revokeAppleAuthorization(
  refreshToken: string
) {
  const clientId =
    getRequiredSecret(
      "APPLE_CLIENT_ID"
    );

  const clientSecret =
    await createAppleClientSecret();

  const response =
    await fetch(
      APPLE_REVOKE_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret:
            clientSecret,
          token: refreshToken,
          token_type_hint:
            "refresh_token",
        }),
      }
    );

  if (!response.ok) {
    const responseText =
      await response.text();

    throw new Error(
      `Apple token revocation failed with status ${response.status}: ${responseText}`
    );
  }
}

async function requestAmplitudeUserDeletion(
  userId: string
) {
  const apiKey =
    getRequiredSecret(
      "AMPLITUDE_API_KEY"
    );

  const secretKey =
    getRequiredSecret(
      "AMPLITUDE_SECRET_KEY"
    );

  const credentials =
    btoa(
      `${apiKey}:${secretKey}`
    );

  const response =
    await fetch(
      AMPLITUDE_PRIVACY_URL,
      {
        method: "POST",
        headers: {
          Authorization:
            `Basic ${credentials}`,
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
        },
        body: JSON.stringify({
          user_ids: [userId],
          delete_from_org: "True",
          ignore_invalid_ids: "True",
        }),
      }
    );

  if (!response.ok) {
    const responseText =
      await response.text();

    throw new Error(
      `Amplitude deletion request failed with status ${response.status}: ${responseText}`
    );
  }
}

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

      /*
       * The Edge Runtime client is not generated
       * with the app's database schema, so keep
       * this cast local to server-only access to
       * apple_auth_tokens.
       */
      const supabaseAdmin =
        ctx.supabaseAdmin as any;

      const {
        data: appleTokenData,
        error: appleTokenError,
      } = await supabaseAdmin
        .from("apple_auth_tokens")
        .select("refresh_token")
        .eq("user_id", userId)
        .maybeSingle();

      if (appleTokenError) {
        console.error(
          "Failed to load Apple refresh token:",
          appleTokenError
        );

        return Response.json(
          {
            error:
              "Failed to prepare account deletion.",
          },
          {
            status: 500,
          }
        );
      }

      const appleToken =
        appleTokenData as
          AppleAuthTokenRow | null;

      if (appleToken?.refresh_token) {
        try {
          await revokeAppleAuthorization(
            appleToken.refresh_token
          );
        } catch (error) {
          console.error(
            "Failed to revoke Sign in with Apple authorization:",
            error
          );

          return Response.json(
            {
              error:
                "Failed to revoke Sign in with Apple authorization.",
            },
            {
              status: 502,
            }
          );
        }
      }

      const avatarPath =
        `${userId}/avatar`;

      const {
        error: avatarDeleteError,
      } = await ctx.supabaseAdmin.storage
        .from(AVATARS_BUCKET)
        .remove([avatarPath]);

      if (avatarDeleteError) {
        console.error(
          "Failed to delete account avatar:",
          avatarDeleteError
        );

        return Response.json(
          {
            error:
              "Failed to delete account data.",
          },
          {
            status: 500,
          }
        );
      }

      try {
        await requestAmplitudeUserDeletion(
          userId
        );
      } catch (error) {
        console.error(
          "Failed to request Amplitude user deletion:",
          error
        );

        return Response.json(
          {
            error:
              "Failed to delete analytics data.",
          },
          {
            status: 502,
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