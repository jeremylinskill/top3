import { Top3Item } from '@/types/top3-item';

// Isolated Book Type search: no changes to general or Genre/Theme searches.
// Catalogue format metadata is incomplete, so we require explicit evidence
// and return fewer results rather than pretending an unrelated book matches.
const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_URL = 'https://openlibrary.org/search.json';
const GOOGLE_BOOKS_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

const BOOK_TYPES = [
  'graphic-novels-comics',
  'novellas',
  'short-story-collections',
  'essay-collections',
  'anthologies',
] as const;

type BookType = (typeof BOOK_TYPES)[number];

type GoogleBookVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    categories?: string[];
    mainCategory?: string;
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

type OpenLibraryDocument = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
};

type FormatCandidate = {
  item: Top3Item;
  strength: number;
};

function isBookType(value: string): value is BookType {
  return BOOK_TYPES.some((type) => type === value);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatStrength(
  type: BookType,
  title: string,
  classifications: string[],
  description = ''
): number {
  const metadata = classifications.join(' ').toLowerCase();
  const summary = description.toLowerCase();
  const name = title.toLowerCase();

  switch (type) {
    case 'graphic-novels-comics':
      if (/graphic novels?|graphic memoirs?|comic books?|comics|manga|manhwa|comic strips|sequential art/.test(metadata)) return 3;
      if (/graphic novels?|graphic memoirs?|comic book series|comic book adaptation|manga series/.test(summary)) return 2;
      if (/\bgraphic novel\b|\bmanga\b|\bcomic books?\b/.test(name)) return 2;
      return 0;
    case 'novellas':
      if (/\bnovellas?\b|\bshort novels?\b/.test(metadata)) return 3;
      if (/\bnovella\b|\bshort novel\b/.test(summary)) return 2;
      if (/\bnovella\b/.test(name)) return 2;
      return 0;
    case 'short-story-collections':
      if (/short stor(?:y|ies)|collected stories|story collections/.test(metadata)) return 3;
      if (/collection of short stories|short story collection|collection of stories|collected short stories/.test(summary)) return 2;
      if (/short stories|collected stories|selected stories/.test(name)) return 2;
      return 0;
    case 'essay-collections':
      if (/\bessays\b|\bessay collections?\b|collected essays/.test(metadata)) return 3;
      if (/collection of essays|essays by|collected essays|series of essays/.test(summary)) return 2;
      if (/\bessays\b|collected essays/.test(name)) return 2;
      return 0;
    case 'anthologies':
      if (/\bantholog(?:y|ies)\b/.test(metadata)) return 3;
      if (/\bantholog(?:y|ies)\b|collection of works by (?:multiple|different|various) (?:writers|authors)/.test(summary)) return 2;
      if (/\bantholog(?:y|ies)\b/.test(name)) return 2;
      return 0;
  }
}

async function searchGoogleBooks(
  query: string,
  type: BookType,
  signal?: AbortSignal
): Promise<FormatCandidate[]> {
  if (!GOOGLE_BOOKS_KEY) return [];

  const params = new URLSearchParams({
    q: `intitle:${query}`,
    maxResults: '40',
    printType: 'books',
    key: GOOGLE_BOOKS_KEY,
  });
  const response = await fetch(`${GOOGLE_BOOKS_URL}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Google Books Type search failed: ${response.status}`);
  const payload = (await response.json()) as { items?: GoogleBookVolume[] };
  const results: FormatCandidate[] = [];

  for (const volume of payload.items ?? []) {
    const info = volume.volumeInfo;
    if (!volume.id || !info?.title) continue;
    const strength = formatStrength(
      type,
      info.title,
      [...(info.categories ?? []), info.mainCategory ?? ''],
      info.description
    );
    if (strength < 2) continue;
    const imageUrl = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
    results.push({
      strength,
      item: {
        id: volume.id,
        title: info.title,
        subtitle: info.authors?.join(', ') ?? 'Author unknown',
        imageUrl: imageUrl?.replace(/^http:\/\//, 'https://'),
        googleBooksVolumeId: volume.id,
      },
    });
  }
  return results;
}

async function searchOpenLibraryBooks(
  query: string,
  type: BookType,
  signal?: AbortSignal
): Promise<FormatCandidate[]> {
  // Query the title and inspect returned work subjects; subject terms vary
  // considerably between Open Library records.
  const safeQuery = query.replace(/["\\]/g, ' ').trim();
  const params = new URLSearchParams({
    q: `title:"${safeQuery}"`,
    fields: 'key,title,author_name,first_publish_year,cover_i,subject',
    limit: '40',
  });
  const response = await fetch(`${OPEN_LIBRARY_URL}?${params.toString()}`, {
    signal,
    headers: { 'User-Agent': 'Top 3 (support@top3taste.com)' },
  });
  if (!response.ok) throw new Error(`Open Library Type search failed: ${response.status}`);
  const payload = (await response.json()) as { docs?: OpenLibraryDocument[] };
  const results: FormatCandidate[] = [];

  for (const book of payload.docs ?? []) {
    if (!book.key || !book.title) continue;
    const strength = formatStrength(type, book.title, book.subject ?? []);
    if (strength < 2) continue;
    const authors = book.author_name?.join(', ') ?? 'Author unknown';
    results.push({
      strength,
      item: {
        id: book.key,
        title: book.title,
        subtitle: book.first_publish_year
          ? `${authors} · ${book.first_publish_year}`
          : authors,
        imageUrl: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
          : undefined,
      },
    });
  }
  return results;
}

function titleScore(title: string, query: string): number {
  const name = normalize(title);
  const search = normalize(query);
  if (name === search) return 400;
  if (name.startsWith(search)) return 300;
  if (name.includes(search)) return 200;
  const terms = search.split(' ').filter(Boolean);
  return terms.filter((term) => name.includes(term)).length * 20;
}

export async function searchBooksByType(
  query: string,
  type: string,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];
  if (!isBookType(type)) throw new Error('Unrecognized Book Type.');

  const searches = await Promise.allSettled([
    searchGoogleBooks(trimmedQuery, type, signal),
    searchOpenLibraryBooks(trimmedQuery, type, signal),
  ]);
  if (signal?.aborted) {
    const error = new Error('The request was aborted.');
    error.name = 'AbortError';
    throw error;
  }
  if (searches.every((result) => result.status === 'rejected')) {
    throw new Error('Book format search is temporarily unavailable.');
  }

  const candidates = searches.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : []
  );
  const ranked = candidates.sort((a, b) =>
    (titleScore(b.item.title, trimmedQuery) + b.strength * 30 + (b.item.imageUrl ? 4 : 0)) -
    (titleScore(a.item.title, trimmedQuery) + a.strength * 30 + (a.item.imageUrl ? 4 : 0))
  );
  const seen = new Set<string>();
  return ranked.filter(({ item }) => {
    const key = normalize(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10).map(({ item }) => item);
}


/**
 * Evaluate a saved book by its actual catalogue record rather than a title
 * search (which can select the wrong edition). A null result is unknown,
 * not evidence that the book belongs to this Type.
 */
export async function checkSavedBookType(
  item: Top3Item,
  type: string,
  signal?: AbortSignal
): Promise<boolean | null> {
  if (!isBookType(type)) return null;

  const workId = item.id.match(/^\/works\/(OL\d+W)$/)?.[1];
  if (workId) {
    try {
      const response = await fetch(
        `https://openlibrary.org/works/${encodeURIComponent(workId)}.json`,
        { signal }
      );
      if (!response.ok) return null;
      const work = (await response.json()) as {
        title?: string;
        subjects?: string[];
        description?: string | { value?: string };
      };
      const description = typeof work.description === 'string'
        ? work.description
        : work.description?.value ?? '';
      if (!work.subjects?.length && !description) return null;
      return formatStrength(
        type,
        work.title ?? item.title,
        work.subjects ?? [],
        description
      ) >= 2;
    } catch (error) {
      if (signal?.aborted) throw error;
      return null;
    }
  }

  const volumeId = item.googleBooksVolumeId?.trim() || item.id.trim();
  if (!GOOGLE_BOOKS_KEY || !volumeId || volumeId.startsWith('fallback-')) {
    return null;
  }
  try {
    const params = new URLSearchParams({ key: GOOGLE_BOOKS_KEY });
    const response = await fetch(
      `${GOOGLE_BOOKS_URL}/${encodeURIComponent(volumeId)}?${params.toString()}`,
      { signal }
    );
    if (!response.ok) return null;
    const book = (await response.json()) as GoogleBookVolume;
    const info = book.volumeInfo;
    if (!info) return null;
    const classifications = [
      ...(info.categories ?? []), info.mainCategory ?? '',
    ].filter(Boolean);
    if (!classifications.length && !info.description) return null;
    return formatStrength(
      type,
      info.title ?? item.title,
      classifications,
      info.description
    ) >= 2;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}
