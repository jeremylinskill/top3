import { supabase } from '@/lib/supabase';
import { Top3Item } from '@/types/top3-item';

type VideoGameSearchResponse = {
  results?: Top3Item[];
  error?: string;
};

async function invokeVideoGameSearch(
  body: Record<string, unknown>
): Promise<Top3Item[]> {
  const { data, error } =
    await supabase.functions.invoke(
      'video-game-search',
      {
        body,
      }
    );

  if (error) {
    console.error(
      'Video Game Edge Function invocation failed:',
      error
    );

    throw new Error(
      'Video game search is temporarily unavailable.'
    );
  }

  const response =
    data as VideoGameSearchResponse | null;

  if (response?.error) {
    console.error(
      'Video Game Edge Function returned an error:',
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
      'Video Game Edge Function returned an invalid response:',
      data
    );

    throw new Error(
      'Video game search returned an invalid response.'
    );
  }

  return response.results;
}

export async function searchVideoGames(
  query: string
): Promise<Top3Item[]> {
  const trimmedQuery =
    query.trim();

  if (!trimmedQuery) {
    return [];
  }

  return invokeVideoGameSearch({
    mode: 'search',
    query: trimmedQuery,
  });
}

export async function getPopularVideoGames(
  topic?: string,
  limit = 5
): Promise<Top3Item[]> {
  const normalizedTopic =
    topic?.trim() || 'general';

  const normalizedLimit =
    Math.min(
      Math.max(
        Math.floor(limit),
        1
      ),
      50
    );

  return invokeVideoGameSearch({
    mode: 'popular',
    topic: normalizedTopic,
    limit: normalizedLimit,
  });
}
