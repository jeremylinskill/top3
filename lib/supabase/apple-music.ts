import { supabase } from '@/lib/supabase';
import { Top3Item } from '@/types/top3-item';

type AppleMusicSearchResponse = {
  results?: Top3Item[];
  error?: string;
};

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
      'Song search is temporarily unavailable.'
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
      'Song search returned an invalid response.'
    );
  }

  return response.results;
}

export async function searchAppleMusicSongs(
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
    query: trimmedQuery,
    topic:
      trimmedTopic || undefined,
  });
}

export async function getPopularAppleMusicSongs(
  topic?: string,
  limit = 20
): Promise<Top3Item[]> {
  const trimmedTopic =
    topic?.trim();

  return invokeAppleMusic({
    mode: 'popular',
    topic:
      trimmedTopic || undefined,
    limit,
  });
}