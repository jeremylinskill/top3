import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

type YouTubeVideoStatusRequestBody = {
  videoId?: unknown;
};

type YouTubeVideoStatus = {
  embeddable?: boolean;
  madeForKids?: boolean;
};

type YouTubeVideoResource = {
  id?: string;
  status?: YouTubeVideoStatus;
};

type YouTubeVideosResponse = {
  items?: YouTubeVideoResource[];
};

const YOUTUBE_VIDEOS_URL =
  'https://www.googleapis.com/youtube/v3/videos';

const MAX_VIDEO_ID_LENGTH = 64;

function jsonResponse(
  body: unknown,
  status = 200
): Response {
  return Response.json(body, {
    status,
  });
}

function isValidVideoId(
  videoId: string
): boolean {
  return (
    videoId.length > 0 &&
    videoId.length <= MAX_VIDEO_ID_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(videoId)
  );
}

export default {
  fetch: withSupabase(
    {
      auth: 'publishable',
    },
    async (
      request: Request
    ) => {
      try {
        if (request.method !== 'POST') {
          return jsonResponse(
            {
              error:
                'Method not allowed.',
            },
            405
          );
        }

        const apiKey =
          Deno.env.get(
            'YOUTUBE_API_KEY'
          );

        if (!apiKey) {
          console.error(
            'Missing YouTube API key.'
          );

          return jsonResponse(
            {
              error:
                'YouTube video status is not configured.',
            },
            500
          );
        }

        let body:
          YouTubeVideoStatusRequestBody;

        try {
          body =
            (await request.json()) as
              YouTubeVideoStatusRequestBody;
        } catch {
          return jsonResponse(
            {
              error:
                'Invalid request body.',
            },
            400
          );
        }

        if (
          typeof body.videoId !==
          'string'
        ) {
          return jsonResponse(
            {
              error:
                'A YouTube video ID is required.',
            },
            400
          );
        }

        const videoId =
          body.videoId.trim();

        if (
          !isValidVideoId(videoId)
        ) {
          return jsonResponse(
            {
              error:
                'Invalid YouTube video ID.',
            },
            400
          );
        }

        const url =
          new URL(
            YOUTUBE_VIDEOS_URL
          );

        url.searchParams.set(
          'part',
          'id,status'
        );
        url.searchParams.set(
          'id',
          videoId
        );
        url.searchParams.set(
          'key',
          apiKey
        );

        const response =
          await fetch(
            url.toString(),
            {
              headers: {
                Accept:
                  'application/json',
              },
            }
          );

        if (!response.ok) {
          const responseText =
            await response.text();

          console.error(
            'YouTube video status request failed:',
            response.status,
            responseText
          );

          return jsonResponse(
            {
              error:
                'YouTube video status is temporarily unavailable.',
            },
            502
          );
        }

        const data =
          (await response.json()) as
            YouTubeVideosResponse;

        const video =
          data.items?.[0];

        if (
          !video ||
          video.id !== videoId
        ) {
          return jsonResponse({
            allowed: false,
            reason:
              'not_found',
          });
        }

        const madeForKids =
          video.status?.madeForKids;

        const embeddable =
          video.status?.embeddable;

        if (
          typeof madeForKids !==
            'boolean' ||
          typeof embeddable !==
            'boolean'
        ) {
          console.error(
            'YouTube returned incomplete video status:',
            video
          );

          return jsonResponse({
            allowed: false,
            reason:
              'status_unavailable',
          });
        }

        if (madeForKids) {
          return jsonResponse({
            allowed: false,
            reason:
              'made_for_kids',
            madeForKids,
            embeddable,
          });
        }

        if (!embeddable) {
          return jsonResponse({
            allowed: false,
            reason:
              'not_embeddable',
            madeForKids,
            embeddable,
          });
        }

        return jsonResponse({
          allowed: true,
          madeForKids,
          embeddable,
        });
      } catch (error) {
        console.error(
          'YouTube video status Edge Function failed:',
          error
        );

        return jsonResponse(
          {
            error:
              'YouTube video status is temporarily unavailable.',
          },
          500
        );
      }
    }
  ),
};
