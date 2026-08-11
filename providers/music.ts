import {
    searchAppleMusicSongs,
} from '@/lib/supabase/apple-music';
import { Top3Item } from '@/types/top3-item';


export async function searchMusic(
  query: string,
  topic?: string,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return searchAppleMusicSongs(
    query,
    topic
  );
}