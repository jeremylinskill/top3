import { supabase } from '@/lib/supabase';
import { Top3Item } from '@/types/top3-item';

type AppleMusicSearchResponse = {
  results?: Top3Item[];
  error?: string;
};

type AppleMusicResource =
  | 'albums'
  | 'artists'
  | 'songs';

async function invokeAppleMusic(
  body: Record<string, unknown>
): Promise<Top3Item[]> {
  const { data, error } =
    await supabase.functions.invoke(
      'apple-music-search',
      {
        body,
      }
    );

  if (error) {
    console.error(
      'Apple Music Edge Function invocation failed:',
      error
    );

    throw new Error(
      'Apple Music search is temporarily unavailable.'
    );
  }

  const response =
    data as AppleMusicSearchResponse | null;

  if (response?.error) {
    console.error(
      'Apple Music Edge Function returned an error:',
      response.error
    );

    throw new Error(
      response.error
    );
  }

  if (
    !Array.isArray(
      response?.results
    )
  ) {
    console.error(
      'Apple Music Edge Function returned an invalid response:',
      data
    );

    throw new Error(
      'Apple Music search returned an invalid response.'
    );
  }

  return response.results;
}

async function searchAppleMusic(
  resource: AppleMusicResource,
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  const trimmedQuery =
    query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const trimmedTopic =
    topic?.trim();

  return invokeAppleMusic({
    resource,
    query: trimmedQuery,
    topic:
      trimmedTopic || undefined,
  });
}

async function getPopularAppleMusic(
  resource: AppleMusicResource,
  topic?: string,
  limit = 20
): Promise<Top3Item[]> {
  const trimmedTopic =
    topic?.trim();

  return invokeAppleMusic({
    mode: 'popular',
    resource,
    topic:
      trimmedTopic || undefined,
    limit,
  });
}

export async function searchAppleMusicAlbums(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  return searchAppleMusic(
    'albums',
    query,
    topic
  );
}

export async function searchAppleMusicArtists(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  return searchAppleMusic(
    'artists',
    query,
    topic
  );
}

export async function searchAppleMusicSongs(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  return searchAppleMusic(
    'songs',
    query,
    topic
  );
}

export async function getPopularAppleMusicAlbums(
  topic?: string,
  limit = 20
): Promise<Top3Item[]> {
  return getPopularAppleMusic(
    'albums',
    topic,
    limit
  );
}

export async function getPopularAppleMusicArtists(
  topic?: string,
  limit = 20
): Promise<Top3Item[]> {
  return getPopularAppleMusic(
    'artists',
    topic,
    limit
  );
}

export async function getPopularAppleMusicSongs(
  topic?: string,
  limit = 20
): Promise<Top3Item[]> {
  return getPopularAppleMusic(
    'songs',
    topic,
    limit
  );
}