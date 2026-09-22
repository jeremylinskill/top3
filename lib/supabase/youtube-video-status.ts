import { supabase } from '@/lib/supabase';

type YouTubeVideoStatusResponse = {
  allowed?: boolean;
  madeForKids?: boolean;
  embeddable?: boolean;
  reason?: string;
  error?: string;
};

const VIDEO_ALLOWED_CACHE =
  new Map<string, boolean>();

const VIDEO_ALLOWED_REQUEST_CACHE =
  new Map<string, Promise<boolean>>();

async function fetchYouTubeVideoAllowed(
  videoId: string
): Promise<boolean> {
  const { data, error } =
    await supabase.functions.invoke(
      'youtube-video-status',
      {
        body: {
          videoId,
        },
      }
    );

  if (error) {
    if (__DEV__) {
      console.log(
        'YouTube video status Edge Function invocation failed:',
        error
      );
    }

    throw new Error(
      'Trailer availability is temporarily unavailable.'
    );
  }

  const response =
    data as YouTubeVideoStatusResponse | null;

  if (response?.error) {
    if (__DEV__) {
      console.log(
        'YouTube video status Edge Function returned an error:',
        response.error
      );
    }

    throw new Error(
      response.error
    );
  }

  if (
    typeof response?.allowed !==
    'boolean'
  ) {
    if (__DEV__) {
      console.log(
        'YouTube video status Edge Function returned an invalid response:',
        data
      );
    }

    throw new Error(
      'Trailer availability returned an invalid response.'
    );
  }

  return response.allowed;
}

export async function isYouTubeVideoAllowed(
  videoId: string
): Promise<boolean> {
  const trimmedVideoId =
    videoId.trim();

  if (!trimmedVideoId) {
    return false;
  }

  if (
    VIDEO_ALLOWED_CACHE.has(
      trimmedVideoId
    )
  ) {
    return (
      VIDEO_ALLOWED_CACHE.get(
        trimmedVideoId
      ) ?? false
    );
  }

  const existingRequest =
    VIDEO_ALLOWED_REQUEST_CACHE.get(
      trimmedVideoId
    );

  if (existingRequest) {
    return existingRequest;
  }

  const request =
    fetchYouTubeVideoAllowed(
      trimmedVideoId
    )
      .then((allowed) => {
        VIDEO_ALLOWED_CACHE.set(
          trimmedVideoId,
          allowed
        );

        return allowed;
      })
      .finally(() => {
        VIDEO_ALLOWED_REQUEST_CACHE.delete(
          trimmedVideoId
        );
      });

  VIDEO_ALLOWED_REQUEST_CACHE.set(
    trimmedVideoId,
    request
  );

  return request;
}
