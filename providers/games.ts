import {
  getPopularIgdbGames,
  searchIgdbGames,
} from '@/lib/supabase/igdb';
import { Top3Item } from '@/types/top3-item';

export async function searchGames(
  query: string,
  _topic?: string,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return searchIgdbGames(query);
}

export async function getPopularGames(
  topic?: string,
  limit = 5,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return getPopularIgdbGames(
    topic,
    limit
  );
}