import {
  getPopularVideoGames,
  searchVideoGames,
} from '@/lib/supabase/video-games';
import { Top3Item } from '@/types/top3-item';


export async function searchGames(
  query: string,
  _topic?: string,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return searchVideoGames(query);
}


export async function getPopularGames(
  topic?: string,
  limit = 5,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return getPopularVideoGames(
    topic,
    limit
  );
}