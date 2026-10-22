import type { CollectionOption } from '@/types/collection-option';
import type { SavedItem } from '@/lib/supabase/saved-items';
import { getSearchProvider } from '@/providers/search';
import { checkSavedBookType } from '@/providers/book-types';

export type Eligibility = 'match' | 'no-match' | 'unknown';

// Cache only verified outcomes. Unknown results are retried on a later visit.
const eligibilityCache = new Map<string, Eligibility>();

function normalize(value: string): string {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function genreMatches(value: string, desired: string): boolean {
  const genre = normalize(value);
  const topic = normalize(desired);
  if (genre === topic) return true;
  const aliases: Record<string, string[]> = {
    'sci fi': ['science fiction'],
    rpg: ['role playing rpg', 'role playing'],
    'hip hop': ['hip hop rap', 'rap'],
    'r and b': ['r b', 'r b soul', 'rnb'],
  };
  return (aliases[topic] ?? []).includes(genre);
}

/**
 * Never infer Type membership just from a matching title or category.
 * A provider search can prove membership through the exact stored item ID,
 * but a missing result in a capped search is UNKNOWN, not a definitive no.
 */
export async function verifySavedEligibility(
  saved: SavedItem,
  collectionOption: CollectionOption | undefined,
  topic: string | undefined,
  signal?: AbortSignal
): Promise<Eligibility> {
  if (collectionOption?.kind === 'theme') return 'match';
  const isType = collectionOption?.kind === 'type';
  const chosenTopic = topic?.trim() ?? '';
  if (!isType && (!chosenTopic || chosenTopic.toLowerCase() === 'general')) {
    return 'match';
  }

  const key = [saved.category, saved.item.id,
    collectionOption?.id ?? '', normalize(chosenTopic)].join('|');
  const cached = eligibilityCache.get(key);
  if (cached) return cached;

  // A saved item originally sourced from this exact Genre is trustworthy
  // positive evidence; it's not the only route to becoming eligible.
  if (!isType && saved.sourceTopic &&
      normalize(saved.sourceTopic) === normalize(chosenTopic)) {
    eligibilityCache.set(key, 'match');
    return 'match';
  }

  if (!isType && saved.item.genres?.length) {
    const result = saved.item.genres.some((genre) =>
      genreMatches(genre, chosenTopic)
    ) ? 'match' : 'no-match';
    eligibilityCache.set(key, result);
    return result;
  }

  if (isType && saved.category === 'books') {
    const bookType = collectionOption?.providerConfig?.bookType;
    if (typeof bookType !== 'string') return 'unknown';
    const decision = await checkSavedBookType(saved.item, bookType, signal);
    const outcome: Eligibility = decision === null
      ? 'unknown' : decision ? 'match' : 'no-match';
    if (outcome !== 'unknown') eligibilityCache.set(key, outcome);
    return outcome;
  }

  // Apple Music's compilation bit is stronger than a search-result guess.
  if (isType && saved.category === 'albums' &&
      collectionOption?.id === 'albums-type-compilations' &&
      typeof saved.item.isCompilation === 'boolean') {
    const result = saved.item.isCompilation ? 'match' : 'no-match';
    eligibilityCache.set(key, result);
    return result;
  }

  // Do not mistake an unrestricted category search for a Type check.
  // These are the Types with existing genuinely constrained providers.
  if (isType) {
    const supported =
      (saved.category === 'games' &&
        typeof collectionOption?.providerConfig?.gameType === 'string') ||
      (saved.category === 'songs' &&
        ['songs-type-live', 'songs-type-acoustic', 'songs-type-remixes']
          .includes(collectionOption?.id ?? '')) ||
      (saved.category === 'albums' &&
        ['albums-type-live', 'albums-type-compilations',
          'albums-type-soundtracks'].includes(collectionOption?.id ?? ''));
    if (!supported) return 'unknown';
  }

  // Some Genre providers intentionally include unrestricted title results,
  // so an exact ID alone does NOT prove Genre eligibility for them.
  if (!isType && !['movies', 'tv'].includes(saved.category)) {
    return 'unknown';
  }

  // For other providers, use their existing filtered search pathways.
  // Only an EXACT provider ID confirms membership. The search result cap
  // means non-matches are unknown instead of assumed ineligible.
  const provider = getSearchProvider(saved.category, collectionOption);
  if (!provider) return 'unknown';
  try {
    const results = await provider(
      saved.item.title,
      isType ? undefined : chosenTopic,
      signal
    );
    const match = results.some((item) => item.id === saved.item.id);
    if (match) {
      eligibilityCache.set(key, 'match');
      return 'match';
    }
    return 'unknown';
  } catch (error) {
    if (signal?.aborted) throw error;
    return 'unknown';
  }
}
