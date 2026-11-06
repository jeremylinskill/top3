import type { CollectionOption } from '@/types/collection-option';
import type { Top3Item } from '@/types/top3-item';

/** Only objective TMDB Movie Theme rules are enforced here. */
export type ObjectiveMovieThemeConstraint =
  | { kind: 'actor'; actorId: number }
  | { kind: 'period'; fromDate?: string; toDate?: string };

type Eligibility = 'match' | 'no-match' | 'unknown';

type MovieDetails = { id?: number; release_date?: string };
const TMDB_BASE = 'https://api.themoviedb.org/3';
const CACHE_MS = 10 * 60 * 1000;
const castCache = new Map<number, { ids: Set<number>; expiresAt: number }>();
const pendingCast = new Map<number, Promise<Set<number>>>();
const dateCache = new Map<number, { date: string | null; expiresAt: number }>();

export function getObjectiveMovieThemeConstraint(
  option?: CollectionOption
): ObjectiveMovieThemeConstraint | undefined {
  if (
    option?.categoryId !== 'movies' || option.kind !== 'theme' ||
    option.providerKey !== 'tmdb' || option.providerMode !== 'discover'
  ) return undefined;

  const config = option.providerConfig;
  if (
    Array.isArray(config.keywordRules) && config.keywordRules.length > 0 ||
    typeof config.withCompanies === 'number'
  ) return undefined;

  if (Number.isSafeInteger(config.withPeople) &&
      (config.withPeople as number) > 0) {
    return { kind: 'actor', actorId: config.withPeople as number };
  }

  if (typeof config.withPeople === 'number') return undefined;
  const fromDate = typeof config.primaryReleaseDateGte === 'string'
    ? config.primaryReleaseDateGte : undefined;
  const toDate = typeof config.primaryReleaseDateLte === 'string'
    ? config.primaryReleaseDateLte : undefined;
  if ((!fromDate && !toDate) ||
      (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) ||
      (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) ||
      (fromDate && toDate && fromDate > toDate)) return undefined;
  return { kind: 'period', fromDate, toDate };
}

function tmdbApiKey(): string {
  const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
  if (!apiKey) throw new Error('Missing TMDB API key');
  return apiKey;
}

function tmdbMovieId(item: Top3Item): number | undefined {
  // Never treat fallback titles or non-TMDB identifiers as verified matches.
  const match = /^movie-(\d+)$/.exec(item.id);
  if (!match) return undefined;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

async function getActorCastIds(actorId: number): Promise<Set<number>> {
  const existing = castCache.get(actorId);
  if (existing && existing.expiresAt > Date.now()) return existing.ids;
  const inFlight = pendingCast.get(actorId);
  if (inFlight) return inFlight;
  const pending = (async () => {
    const params = new URLSearchParams({
      api_key: tmdbApiKey(),
      language: 'en-US',
    });
    const response = await fetch(
      `${TMDB_BASE}/person/${actorId}/movie_credits?${params.toString()}`
    );
    if (!response.ok) throw new Error(`TMDB actor credits: ${response.status}`);
    const payload = await response.json() as { cast?: Array<{ id?: number }> };
    const ids = new Set<number>();
    (payload.cast ?? []).forEach((credit) => {
      if (Number.isSafeInteger(credit.id) && (credit.id ?? 0) > 0) {
        ids.add(credit.id as number);
      }
    });
    castCache.set(actorId, { ids, expiresAt: Date.now() + CACHE_MS });
    return ids;
  })();
  pendingCast.set(actorId, pending);
  // Both success and error remove the in-flight entry, enabling retry.
  void pending.then(
    () => { if (pendingCast.get(actorId) === pending) pendingCast.delete(actorId); },
    () => { if (pendingCast.get(actorId) === pending) pendingCast.delete(actorId); }
  );
  return pending;
}

async function getVerifiedReleaseDate(movieId: number, signal?: AbortSignal): Promise<string | null> {
  const cached = dateCache.get(movieId);
  if (cached && cached.expiresAt > Date.now()) return cached.date;
  const params = new URLSearchParams({ api_key: tmdbApiKey(), language: 'en-US' });
  const response = await fetch(
    `${TMDB_BASE}/movie/${movieId}?${params.toString()}`,
    { signal }
  );
  if (!response.ok) throw new Error(`TMDB movie details: ${response.status}`);
  const payload = await response.json() as MovieDetails;
  if (payload.id !== movieId) throw new Error('Mismatched TMDB movie ID');
  const releaseDate = typeof payload.release_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(payload.release_date)
    ? payload.release_date : null;
  dateCache.set(movieId, { date: releaseDate, expiresAt: Date.now() + CACHE_MS });
  return releaseDate;
}

/** Fail closed: missing metadata and network failures never make a saved item selectable. */
export async function verifyObjectiveMovieThemeItem(
  item: Top3Item,
  constraint: ObjectiveMovieThemeConstraint,
  signal?: AbortSignal
): Promise<Eligibility> {
  const movieId = tmdbMovieId(item);
  if (!movieId) return 'unknown';
  if (signal?.aborted) return 'unknown';
  try {
    if (constraint.kind === 'actor') {
      const castIds = await getActorCastIds(constraint.actorId);
      if (signal?.aborted) return 'unknown';
      return castIds.has(movieId) ? 'match' : 'no-match';
    }
    const date = await getVerifiedReleaseDate(movieId, signal);
    if (!date || signal?.aborted) return 'unknown';
    return (!constraint.fromDate || date >= constraint.fromDate) &&
      (!constraint.toDate || date <= constraint.toDate)
      ? 'match' : 'no-match';
  } catch {
    return 'unknown';
  }
}
