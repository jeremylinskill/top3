import { Top3Item } from '@/types/top3-item';
import { searchOpenLibrary } from './open-library';

type GoogleBooksVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

type GoogleBooksResponse = {
  items?: GoogleBooksVolume[];
};

const API_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const MIN_TITLE_RESULTS = 5;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function fetchWithRetry(
  url: string,
  attempt = 1
): Promise<Response> {
  const response = await fetch(url);

  if (
    response.ok ||
    !RETRYABLE_STATUS_CODES.has(response.status) ||
    attempt >= MAX_ATTEMPTS
  ) {
    return response;
  }

  const retryAfterHeader = response.headers.get('Retry-After');
  const retryAfterSeconds = retryAfterHeader
    ? Number(retryAfterHeader)
    : Number.NaN;

  const delayMilliseconds = Number.isFinite(retryAfterSeconds)
    ? retryAfterSeconds * 1000
    : 500 * 2 ** (attempt - 1);

  await wait(delayMilliseconds);

  return fetchWithRetry(url, attempt + 1);
}

function mapGoogleBook(book: GoogleBooksVolume): Top3Item {
  const info = book.volumeInfo ?? {};

  const authors =
    info.authors?.join(', ') ?? 'Author unknown';

  const publishedYear = info.publishedDate
    ? info.publishedDate.slice(0, 4)
    : '';

  const rawImageUrl =
    info.imageLinks?.thumbnail ??
    info.imageLinks?.smallThumbnail;

  const imageUrl = rawImageUrl
    ? rawImageUrl.replace('http://', 'https://')
    : undefined;

  return {
    id: book.id,
    title: info.title ?? 'Untitled',
    subtitle: publishedYear
      ? `${authors} · ${publishedYear}`
      : authors,
    imageUrl,
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTitleScore(title: string, query: string) {
  const normalizedTitle = normalizeText(title);
  const normalizedQuery = normalizeText(query);

  if (normalizedTitle === normalizedQuery) {
    return 1000;
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    return 900;
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    return 700;
  }

  const queryWords = normalizedQuery.split(' ');
  const titleWords = normalizedTitle.split(' ');

  const matchingWords = queryWords.filter((queryWord) =>
    titleWords.some((titleWord) => titleWord.startsWith(queryWord))
  ).length;

  return matchingWords * 100;
}

function rankByTitle(
  results: Top3Item[],
  query: string
): Top3Item[] {
  return results
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      score: getTitleScore(item.title, query),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.originalIndex - b.originalIndex;
    })
    .map(({ item }) => item);
}

function mergeUniqueResults(
  primaryResults: Top3Item[],
  secondaryResults: Top3Item[]
) {
  const seenIds = new Set<string>();
  const mergedResults: Top3Item[] = [];

  for (const item of [...primaryResults, ...secondaryResults]) {
    if (seenIds.has(item.id)) {
      continue;
    }

    seenIds.add(item.id);
    mergedResults.push(item);
  }

  return mergedResults;
}

function buildRequestUrl(query: string) {
  const fields =
    'items(id,volumeInfo(title,authors,publishedDate,imageLinks/thumbnail,imageLinks/smallThumbnail))';

  return (
    `${API_BASE_URL}?q=${encodeURIComponent(query)}` +
    `&maxResults=10` +
    `&printType=books` +
    `&projection=lite` +
    `&fields=${encodeURIComponent(fields)}` +
    `&key=${API_KEY}`
  );
}

async function requestGoogleBooks(
  query: string
): Promise<Top3Item[]> {
  const response = await fetchWithRetry(buildRequestUrl(query));

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Google Books request failed: ${response.status}\n${errorBody}`
    );
  }

  const data = (await response.json()) as GoogleBooksResponse;

  return (data.items ?? []).map(mapGoogleBook);
}

async function searchFallback(
  query: string,
  topic?: string
) {
  const results = await searchOpenLibrary(query, topic);

  return rankByTitle(results, query).slice(0, 10);
}

export async function searchBooks(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (!API_KEY) {
    return searchFallback(trimmedQuery, topic);
  }

  const topicFilter = topic ? ` subject:${topic}` : '';

  try {
    // 1. Search titles first.
    const titleQuery =
      `intitle:${trimmedQuery}${topicFilter}`;

    const titleResults = rankByTitle(
      await requestGoogleBooks(titleQuery),
      trimmedQuery
    );

    if (titleResults.length >= MIN_TITLE_RESULTS) {
      return titleResults.slice(0, 10);
    }

    // 2. Broaden the search while keeping title matches first.
    const broadQuery = `${trimmedQuery}${topicFilter}`;

    const broadResults = rankByTitle(
      await requestGoogleBooks(broadQuery),
      trimmedQuery
    );

    const combinedResults = mergeUniqueResults(
      titleResults,
      broadResults
    );

    if (combinedResults.length > 0) {
      return combinedResults.slice(0, 10);
    }

    // 3. Only search authors when no title/general results exist.
    const authorQuery =
      `inauthor:${trimmedQuery}${topicFilter}`;

    const authorResults = await requestGoogleBooks(authorQuery);

    if (authorResults.length > 0) {
      return authorResults.slice(0, 10);
    }

    // 4. Final fallback.
    return searchFallback(trimmedQuery, topic);
  } catch (error) {
    console.warn(
      'Google Books search failed. Using Open Library.',
      error
    );

    return searchFallback(trimmedQuery, topic);
  }
}