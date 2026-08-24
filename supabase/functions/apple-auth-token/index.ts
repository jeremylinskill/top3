// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
    importPKCS8,
    SignJWT,
} from "npm:jose@5.9.6";

type AppleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type RequestBody = {
  authorizationCode?: unknown;
};

const APPLE_TOKEN_URL =
  "https://appleid.apple.com/auth/token";

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

  const privateKeyBase64 =
    getRequiredSecret(
      "APPLE_PRIVATE_KEY_B64"
    );

  const privateKeyPem =
    decodePrivateKey(
      privateKeyBase64
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

      let body: RequestBody;

      try {
        body =
          await request.json();
      } catch {
        return Response.json(
          {
            error:
              "Invalid request body.",
          },
          {
            status: 400,
          }
        );
      }

      const authorizationCode =
        typeof body.authorizationCode ===
          "string"
          ? body.authorizationCode.trim()
          : "";

      if (!authorizationCode) {
        return Response.json(
          {
            error:
              "Apple authorization code is required.",
          },
          {
            status: 400,
          }
        );
      }

      try {
        const clientId =
          getRequiredSecret(
            "APPLE_CLIENT_ID"
          );

        const clientSecret =
          await createAppleClientSecret();

        const tokenResponse =
          await fetch(
            APPLE_TOKEN_URL,
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
                code: authorizationCode,
                grant_type:
                  "authorization_code",
              }),
            }
          );

        const tokenData =
          (await tokenResponse.json()) as
            AppleTokenResponse;

        if (
          !tokenResponse.ok ||
          !tokenData.refresh_token
        ) {
          console.error(
            "Apple token exchange failed:",
            {
              status:
                tokenResponse.status,
              error:
                tokenData.error,
              errorDescription:
                tokenData.error_description,
            }
          );

          return Response.json(
            {
              error:
                "Unable to complete Apple account setup.",
            },
            {
              status: 502,
            }
          );
        }

        const now =
          new Date().toISOString();

        /*
         * The Supabase Edge Runtime client in this
         * function is not generated with the app's
         * database schema, so the new table is not
         * known to its compile-time Database type.
         * Keep the server-only write local and cast
         * only this admin client access.
         */
        const supabaseAdmin =
          ctx.supabaseAdmin as any;

        const {
          error: storageError,
        } = await supabaseAdmin
          .from(
            "apple_auth_tokens"
          )
          .upsert(
            {
              user_id: userId,
              refresh_token:
                tokenData.refresh_token,
              updated_at: now,
            },
            {
              onConflict: "user_id",
            }
          );

        if (storageError) {
          console.error(
            "Failed to store Apple refresh token:",
            storageError
          );

          return Response.json(
            {
              error:
                "Unable to complete Apple account setup.",
            },
            {
              status: 500,
            }
          );
        }

        return Response.json({
          success: true,
        });
      } catch (error) {
        console.error(
          "Apple token exchange failed:",
          error
        );

        return Response.json(
          {
            error:
              "Unable to complete Apple account setup.",
          },
          {
            status: 500,
          }
        );
      }
    }
  ),
};