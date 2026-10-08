import { supabase } from '@/lib/supabase';
import {
  FunctionsHttpError,
} from '@supabase/supabase-js';

export type MediaPreviewEntityKind =
  | 'artist'
  | 'album'
  | 'song';

export type MediaPreviewBylineKind =
  | 'item'
  | 'metadata'
  | 'artist_fallback';

type MediaPreviewBylineResponse = {
  byline?: string | null;
  kind?: MediaPreviewBylineKind | null;
  cached?: boolean;
  reason?: string;
  error?: string;
};

export type MediaPreviewBylineRequest = {
  entityKind: MediaPreviewEntityKind;
  appleMusicItemId: string;
  title: string;
  artistName?: string;
  appleMusicArtistId?: string;
  releaseYear?: string;
  albumName?: string;
};

const MEDIA_BYLINE_CACHE =
  new Map<string, string>();

const MEDIA_BYLINE_REQUEST_CACHE =
  new Map<
    string,
    Promise<string | null>
  >();

async function readFunctionError(
  error: FunctionsHttpError
): Promise<unknown> {
  try {
    return await error.context.json();
  } catch {
    return await error.context.text();
  }
}

function getCacheKey(
  entityKind: MediaPreviewEntityKind,
  appleMusicItemId: string
): string {
  return `${entityKind}:${appleMusicItemId}`;
}

async function fetchMediaPreviewByline(
  request: MediaPreviewBylineRequest
): Promise<string | null> {
  const { data, error } =
    await supabase.functions.invoke(
      'media-preview-byline',
      {
        body: request,
      }
    );

  if (error) {
    if (
      __DEV__ &&
      error instanceof FunctionsHttpError
    ) {
      const errorBody =
        await readFunctionError(
          error
        );

      console.log(
        'Media preview byline Edge Function returned an HTTP error:',
        errorBody
      );
    } else if (__DEV__) {
      console.log(
        'Media preview byline Edge Function invocation failed:',
        error
      );
    }

    return null;
  }

  const response =
    data as
      | MediaPreviewBylineResponse
      | null;

  if (__DEV__) {
    console.log(
      'Media preview byline response:',
      data
    );
  }

  if (response?.error) {
    if (__DEV__) {
      console.log(
        'Media preview byline Edge Function returned an error:',
        response.error
      );
    }

    return null;
  }

  if (
    response?.byline !== null &&
    typeof response?.byline !==
      'string'
  ) {
    if (__DEV__) {
      console.log(
        'Media preview byline Edge Function returned an invalid response:',
        data
      );
    }

    return null;
  }

  return response?.byline ?? null;
}

export async function getMediaPreviewByline(
  request: MediaPreviewBylineRequest
): Promise<string | null> {
  const normalizedRequest = {
    ...request,
    appleMusicItemId:
      request.appleMusicItemId.trim(),
    title:
      request.title.trim(),
    artistName:
      request.artistName?.trim(),
    appleMusicArtistId:
      request.appleMusicArtistId?.trim(),
    releaseYear:
      request.releaseYear?.trim(),
    albumName:
      request.albumName?.trim(),
  };

  if (
    !normalizedRequest.appleMusicItemId ||
    !normalizedRequest.title
  ) {
    return null;
  }

  const cacheKey =
    getCacheKey(
      normalizedRequest.entityKind,
      normalizedRequest.appleMusicItemId
    );

  const cached =
    MEDIA_BYLINE_CACHE.get(
      cacheKey
    );

  if (cached) {
    return cached;
  }

  const existingRequest =
    MEDIA_BYLINE_REQUEST_CACHE.get(
      cacheKey
    );

  if (existingRequest) {
    return existingRequest;
  }

  const pendingRequest =
    fetchMediaPreviewByline(
      normalizedRequest
    )
      .then((byline) => {
        if (byline) {
          MEDIA_BYLINE_CACHE.set(
            cacheKey,
            byline
          );
        }

        return byline;
      })
      .finally(() => {
        MEDIA_BYLINE_REQUEST_CACHE.delete(
          cacheKey
        );
      });

  MEDIA_BYLINE_REQUEST_CACHE.set(
    cacheKey,
    pendingRequest
  );

  return pendingRequest;
}

export async function getArtistPreviewByline(
  appleMusicArtistId: string,
  artistName: string
): Promise<string | null> {
  return getMediaPreviewByline({
    entityKind: 'artist',
    appleMusicItemId:
      appleMusicArtistId,
    title:
      artistName,
    artistName,
    appleMusicArtistId,
  });
}
