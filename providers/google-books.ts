import { Top3Item } from '@/types/top3-item';

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

export async function searchBooks(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (!API_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY in .env'
    );
  }

  const topicQuery = topic ? ` subject:${topic}` : '';
  const fullQuery = `${trimmedQuery}${topicQuery}`;

  const requestUrl =
    `${API_BASE_URL}?q=${encodeURIComponent(fullQuery)}` +
    `&maxResults=20&printType=books&key=${API_KEY}`;

  const response = await fetchWithRetry(requestUrl);

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Google Books request failed: ${response.status}\n${errorBody}`
    );
  }

  const data = (await response.json()) as GoogleBooksResponse;

  return (data.items ?? []).slice(0, 10).map((book) => {
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
  });
}