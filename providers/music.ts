import {
    getPopularAppleMusicAlbums,
    getPopularAppleMusicArtists,
    getPopularAppleMusicSongs,
    searchAppleMusicAlbums,
    searchAppleMusicArtists,
    searchAppleMusicSongs,
} from '@/lib/supabase/apple-music';
import { Top3Item } from '@/types/top3-item';

export async function searchAlbums(
  query: string,
  topic?: string,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return searchAppleMusicAlbums(
    query,
    topic
  );
}

export async function searchArtists(
  query: string,
  topic?: string,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return searchAppleMusicArtists(
    query,
    topic
  );
}

export async function searchSongs(
  query: string,
  topic?: string,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return searchAppleMusicSongs(
    query,
    topic
  );
}

export async function getPopularAlbums(
  topic?: string,
  limit = 20,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return getPopularAppleMusicAlbums(
    topic,
    limit
  );
}

export async function getPopularArtists(
  topic?: string,
  limit = 20,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return getPopularAppleMusicArtists(
    topic,
    limit
  );
}

export async function getPopularSongs(
  topic?: string,
  limit = 20,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  return getPopularAppleMusicSongs(
    topic,
    limit
  );
}