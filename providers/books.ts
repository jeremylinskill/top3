import { BOOK_SUGGESTIONS } from '@/constants/book-suggestions';
import { Top3Item } from '@/types/top3-item';
import { searchOpenLibrary } from './open-library';

type GoogleBooksVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

type GoogleBooksResponse = {
  items?: GoogleBooksVolume[];
};

type OpenLibrarySearchDocument = {
  key?: string;
  title?: string;
  author_name?: string[];
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibrarySearchDocument[];
};

type OpenLibraryWork = {
  description?:
    | string
    | {
        value?: string;
      };
};

export type BookDescriptionSource =
  | 'google-books'
  | 'open-library';

export type BookDescriptionResult = {
  description: string;
  source: BookDescriptionSource;
};

const API_BASE_URL =
  'https://www.googleapis.com/books/v1/volumes';

const API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

const OPEN_LIBRARY_SEARCH_URL =
  'https://openlibrary.org/search.json';

const OPEN_LIBRARY_BASE_URL =
  'https://openlibrary.org';

const OPEN_LIBRARY_REQUEST_HEADERS = {
  'User-Agent':
    'Top 3 (support@top3taste.com)',
};

const bookDescriptionCache =
  new Map<string, string | null>();

const bookDescriptionSourceCache =
  new Map<
    string,
    BookDescriptionSource
  >();

let isGoogleBookDescriptionQuotaExhausted =
  false;

const RETRYABLE_STATUS_CODES = new Set([
  429,
  500,
  502,
  503,
  504,
]);

const MAX_ATTEMPTS = 3;
const MIN_TITLE_RESULTS = 5;

function createAbortError() {
  const error = new Error(
    'The request was aborted.'
  );

  error.name = 'AbortError';

  return error;
}

function wait(
  milliseconds: number,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(
      createAbortError()
    );
  }

  return new Promise(
    (resolve, reject) => {
      const timeoutId = setTimeout(
        () => {
          signal?.removeEventListener(
            'abort',
            handleAbort
          );

          resolve();
        },
        milliseconds
      );

      function handleAbort() {
        clearTimeout(timeoutId);

        signal?.removeEventListener(
          'abort',
          handleAbort
        );

        reject(createAbortError());
      }

      signal?.addEventListener(
        'abort',
        handleAbort,
        {
          once: true,
        }
      );
    }
  );
}

async function fetchWithRetry(
  url: string,
  signal?: AbortSignal,
  attempt = 1
): Promise<Response> {
  const response = await fetch(
    url,
    {
      signal,
    }
  );

  if (
    response.ok ||
    !RETRYABLE_STATUS_CODES.has(
      response.status
    ) ||
    attempt >= MAX_ATTEMPTS
  ) {
    return response;
  }

  const retryAfterHeader =
    response.headers.get(
      'Retry-After'
    );

  const retryAfterSeconds =
    retryAfterHeader
      ? Number(retryAfterHeader)
      : Number.NaN;

  const delayMilliseconds =
    Number.isFinite(
      retryAfterSeconds
    )
      ? retryAfterSeconds * 1000
      : 500 * 2 ** (attempt - 1);

  await wait(
    delayMilliseconds,
    signal
  );

  return fetchWithRetry(
    url,
    signal,
    attempt + 1
  );
}

function mapGoogleBook(
  book: GoogleBooksVolume
): Top3Item {
  const info =
    book.volumeInfo ?? {};

  const authors =
    info.authors?.join(', ') ??
    'Author unknown';

  const rawImageUrl =
    info.imageLinks?.thumbnail ??
    info.imageLinks?.smallThumbnail;

  const imageUrl = rawImageUrl
    ? rawImageUrl.replace(
        'http://',
        'https://'
      )
    : undefined;

  return {
    id: book.id,
    title:
      info.title ?? 'Untitled',
    subtitle: authors,
    imageUrl,
    googleBooksVolumeId: book.id,
  };
}

function normalizeText(
  value: string
) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[̀-ͯ]/g,
      ''
    )
    .replace(
      /[^a-z0-9\s]/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBookTitle(
  value: string
) {
  return normalizeText(value)
    .replace(
      /^(the|a|an)\s+/,
      ''
    )
    .trim();
}

function normalizeEditionFamilyTitle(
  value: string
) {
  return normalizeBookTitle(value)
    .replace(
      /\s+(rev(?:ised)?\s+ed(?:ition)?|revised\s+and\s+expanded(?:\s+edition)?|expanded\s+edition|enhanced\s+edition|anniversary\s+edition|twentieth\s+anniversary\s+edition|international\s+edition|intl(?:\s+edition)?|illustrated\s+edition|illustrated\s+by\s+the\s+author)$/,
      ''
    )
    .trim();
}

function buildTitleQueries(
  query: string
) {
  const normalizedQuery =
    normalizeText(query);

  if (
    /^(the|a|an)\s+/.test(
      normalizedQuery
    )
  ) {
    return [
      `intitle:${query}`,
    ];
  }

  return [
    `intitle:${query}`,
    `intitle:The ${query}`,
    `intitle:A ${query}`,
    `intitle:An ${query}`,
  ];
}

function dedupeResults(
  results: Top3Item[]
) {
  const seenKeys =
    new Set<string>();

  return results.filter(
    (item) => {
      const normalizedTitle =
        normalizeText(
          item.title
        );

      const normalizedAuthor =
        normalizeText(
          item.subtitle ?? ''
        );

      const key =
        `${normalizedTitle}|${normalizedAuthor}`;

      if (
        seenKeys.has(key)
      ) {
        return false;
      }

      seenKeys.add(key);

      return true;
    }
  );
}

function getTitleScore(
  title: string,
  query: string
) {
  const normalizedTitle =
    normalizeBookTitle(title);

  const normalizedQuery =
    normalizeBookTitle(query);

  if (
    normalizedTitle ===
    normalizedQuery
  ) {
    return 1000;
  }

  if (
    normalizedTitle.startsWith(
      normalizedQuery
    )
  ) {
    return 900;
  }

  if (
    normalizedTitle.includes(
      normalizedQuery
    )
  ) {
    return 700;
  }

  const queryWords =
    normalizedQuery.split(' ');

  const titleWords =
    normalizedTitle.split(' ');

  const matchingWords =
    queryWords.filter(
      (queryWord) =>
        titleWords.some(
          (titleWord) =>
            titleWord.startsWith(
              queryWord
            )
        )
    ).length;

  return matchingWords * 100;
}

function rankByTitle(
  results: Top3Item[],
  query: string
): Top3Item[] {
  return dedupeResults(
    results
  )
    .map(
      (
        item,
        originalIndex
      ) => ({
        item,
        originalIndex,
        score: getTitleScore(
          item.title,
          query
        ),
      })
    )
    .sort((a, b) => {
      if (
        b.score !== a.score
      ) {
        return (
          b.score - a.score
        );
      }

      return (
        a.originalIndex -
        b.originalIndex
      );
    })
    .map(({ item }) => item);
}

function getCuratedSearchHint(
  query: string
) {
  const normalizedQuery =
    normalizeBookTitle(query);

  for (const suggestions of Object.values(
    BOOK_SUGGESTIONS
  )) {
    const matchingSuggestion =
      suggestions.find(
        (suggestion) =>
          normalizeBookTitle(
            suggestion.title
          ) === normalizedQuery
      );

    if (matchingSuggestion) {
      return matchingSuggestion.search;
    }
  }

  return undefined;
}

function getAuthorMatchScore(
  item: Top3Item,
  query: string
) {
  const searchHint =
    getCuratedSearchHint(query);

  if (
    !searchHint ||
    !item.subtitle ||
    item.subtitle === 'Author unknown'
  ) {
    return 0;
  }

  const normalizedHint =
    normalizeText(searchHint);

  const authorWords =
    normalizeText(item.subtitle)
      .split(' ')
      .filter(
        (word) =>
          word.length >= 2
      );

  if (authorWords.length === 0) {
    return 0;
  }

  const matchingWords =
    authorWords.filter(
      (word) =>
        normalizedHint.includes(word)
    ).length;

  return Math.round(
    (matchingWords /
      authorWords.length) *
      500
  );
}

function getEditionQualityScore(
  item: Top3Item,
  query: string
) {
  const titleScore =
    getTitleScore(
      item.title,
      query
    );

  const imageScore =
    item.imageUrl ? 250 : 0;

  const authorScore =
    item.subtitle &&
    item.subtitle !== 'Author unknown'
      ? 150
      : 0;

  const curatedAuthorScore =
    getAuthorMatchScore(
      item,
      query
    );

  return (
    titleScore +
    imageScore +
    authorScore +
    curatedAuthorScore
  );
}

function collapseEquivalentEditions(
  results: Top3Item[],
  query: string
) {
  const bestByTitle =
    new Map<
      string,
      {
        item: Top3Item;
        score: number;
        originalIndex: number;
      }
    >();

  results.forEach(
    (item, originalIndex) => {
      const titleKey =
        normalizeEditionFamilyTitle(
          item.title
        );

      const score =
        getEditionQualityScore(
          item,
          query
        );

      const existing =
        bestByTitle.get(
          titleKey
        );

      if (
        !existing ||
        score > existing.score
      ) {
        bestByTitle.set(
          titleKey,
          {
            item,
            score,
            originalIndex,
          }
        );
      }
    }
  );

  return Array.from(
    bestByTitle.values()
  )
    .sort(
      (first, second) =>
        first.originalIndex -
        second.originalIndex
    )
    .map(({ item }) => item);
}

function mergeUniqueResults(
  primaryResults: Top3Item[],
  secondaryResults: Top3Item[]
) {
  const seenIds =
    new Set<string>();

  const mergedResults:
    Top3Item[] = [];

  for (const item of [
    ...primaryResults,
    ...secondaryResults,
  ]) {
    if (
      seenIds.has(
        item.id
      )
    ) {
      continue;
    }

    seenIds.add(item.id);
    mergedResults.push(item);
  }

  return mergedResults;
}

function getGoogleBooksSubject(
  topic?: string
) {
  if (!topic) {
    return 'fiction';
  }

  switch (
    topic.trim().toLowerCase()
  ) {
    case 'sci-fi':
    case 'sci fi':
      return 'science fiction';

    default:
      return topic.toLowerCase();
  }
}

function buildRequestUrl(
  query: string,
  maxResults = 10
) {
  const fields =
    'items(id,volumeInfo(title,authors,publishedDate,imageLinks/thumbnail,imageLinks/smallThumbnail))';

  return (
    `${API_BASE_URL}?q=${encodeURIComponent(
      query
    )}` +
    `&maxResults=${maxResults}` +
    `&printType=books` +
    `&projection=lite` +
    `&fields=${encodeURIComponent(
      fields
    )}` +
    `&key=${API_KEY}`
  );
}

function normalizeBookDescription(
  value?: string
): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  const plainText = trimmedValue
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return plainText || null;
}

function buildBookDescriptionUrl(
  volumeId: string
) {
  const fields =
    'id,volumeInfo(description)';

  return (
    `${API_BASE_URL}/${encodeURIComponent(
      volumeId
    )}` +
    `?fields=${encodeURIComponent(
      fields
    )}` +
    `&key=${API_KEY}`
  );
}

function getBookVolumeId(
  item: Top3Item
): string | undefined {
  const explicitVolumeId =
    item.googleBooksVolumeId?.trim();

  if (explicitVolumeId) {
    return explicitVolumeId;
  }

  const legacyItemId =
    item.id.trim();

  if (
    !legacyItemId ||
    legacyItemId.startsWith(
      'curated-book-'
    )
  ) {
    return undefined;
  }

  return legacyItemId;
}

function getBookAuthorText(
  item: Top3Item
): string {
  return (
    item.subtitle
      ?.split('·')[0]
      .trim() ?? ''
  );
}

function getBookAuthorCandidates(
  item: Top3Item
): string[] {
  const authorText =
    getBookAuthorText(item);

  if (
    !authorText ||
    normalizeText(authorText) ===
      'author unknown'
  ) {
    return [];
  }

  return authorText
    .split(',')
    .map((author) =>
      normalizeText(author)
    )
    .filter(Boolean);
}

function getBookDescriptionCacheKey(
  item: Top3Item
): string | null {
  const normalizedTitle =
    normalizeEditionFamilyTitle(
      item.title
    );

  const normalizedAuthors =
    getBookAuthorCandidates(
      item
    );

  if (
    !normalizedTitle ||
    normalizedAuthors.length === 0
  ) {
    return null;
  }

  return (
    `book:${normalizedTitle}|` +
    normalizedAuthors.join('|')
  );
}

function doesOpenLibraryAuthorMatch(
  document:
    OpenLibrarySearchDocument,
  item: Top3Item
): boolean {
  const itemAuthors =
    getBookAuthorCandidates(
      item
    );

  if (itemAuthors.length === 0) {
    return false;
  }

  const documentAuthors =
    (document.author_name ?? [])
      .map((author) =>
        normalizeText(author)
      )
      .filter(Boolean);

  return itemAuthors.some(
    (itemAuthor) =>
      documentAuthors.some(
        (documentAuthor) =>
          documentAuthor ===
            itemAuthor ||
          documentAuthor.includes(
            itemAuthor
          ) ||
          itemAuthor.includes(
            documentAuthor
          )
      )
  );
}

function getOpenLibraryDescription(
  work: OpenLibraryWork
): string | null {
  if (
    typeof work.description ===
    'string'
  ) {
    return normalizeBookDescription(
      work.description
    );
  }

  if (
    work.description &&
    typeof work.description ===
      'object'
  ) {
    return normalizeBookDescription(
      work.description.value
    );
  }

  return null;
}

async function getOpenLibraryBookDescription(
  item: Top3Item,
  signal?: AbortSignal
): Promise<string | null> {
  const title =
    item.title.trim();

  const author =
    getBookAuthorText(item);

  if (
    !title ||
    !author ||
    getBookAuthorCandidates(
      item
    ).length === 0
  ) {
    return null;
  }

  const searchUrl =
    `${OPEN_LIBRARY_SEARCH_URL}` +
    `?title=${encodeURIComponent(
      title
    )}` +
    `&author=${encodeURIComponent(
      author
    )}` +
    `&fields=${encodeURIComponent(
      'key,title,author_name'
    )}` +
    `&limit=10`;

  const searchResponse =
    await fetch(
      searchUrl,
      {
        signal,
        headers:
          OPEN_LIBRARY_REQUEST_HEADERS,
      }
    );

  if (!searchResponse.ok) {
    const errorBody =
      await searchResponse.text();

    throw new Error(
      `Open Library description search failed: ${searchResponse.status}\n${errorBody}`
    );
  }

  const searchData =
    (await searchResponse.json()) as
      OpenLibrarySearchResponse;

  const normalizedItemTitle =
    normalizeEditionFamilyTitle(
      title
    );

  const matchingDocument =
    (searchData.docs ?? []).find(
      (document) =>
        Boolean(document.key) &&
        normalizeEditionFamilyTitle(
          document.title ?? ''
        ) ===
          normalizedItemTitle &&
        doesOpenLibraryAuthorMatch(
          document,
          item
        )
    );

  const workKey =
    matchingDocument?.key?.trim();

  if (
    !workKey ||
    !workKey.startsWith(
      '/works/'
    )
  ) {
    return null;
  }

  const workResponse =
    await fetch(
      `${OPEN_LIBRARY_BASE_URL}${workKey}.json`,
      {
        signal,
        headers:
          OPEN_LIBRARY_REQUEST_HEADERS,
      }
    );

  if (
    workResponse.status === 404
  ) {
    return null;
  }

  if (!workResponse.ok) {
    const errorBody =
      await workResponse.text();

    throw new Error(
      `Open Library work request failed: ${workResponse.status}\n${errorBody}`
    );
  }

  const work =
    (await workResponse.json()) as
      OpenLibraryWork;

  return getOpenLibraryDescription(
    work
  );
}

export function getCachedBookDescription(
  volumeId: string
): string | null | undefined {
  const trimmedVolumeId =
    volumeId.trim();

  if (!trimmedVolumeId) {
    return null;
  }

  return bookDescriptionCache.get(
    trimmedVolumeId
  );
}

async function getGoogleBookDescription(
  volumeId: string,
  signal?: AbortSignal
): Promise<string | null> {
  const trimmedVolumeId =
    volumeId.trim();

  if (
    !trimmedVolumeId ||
    !API_KEY ||
    isGoogleBookDescriptionQuotaExhausted
  ) {
    return null;
  }

  const cachedDescription =
    getCachedBookDescription(
      trimmedVolumeId
    );

  if (cachedDescription !== undefined) {
    return cachedDescription;
  }

  /*
   * Description requests are user-triggered and
   * have an immediate Open Library fallback.
   * Do not retry a daily quota 429 three times.
   */
  const response =
    await fetch(
      buildBookDescriptionUrl(
        trimmedVolumeId
      ),
      {
        signal,
      }
    );

  if (response.status === 429) {
    isGoogleBookDescriptionQuotaExhausted =
      true;

    throw new Error(
      'Google Books description quota exhausted.'
    );
  }

  if (response.status === 404) {
    bookDescriptionCache.set(
      trimmedVolumeId,
      null
    );

    return null;
  }

  if (!response.ok) {
    const errorBody =
      await response.text();

    throw new Error(
      `Google Books description request failed: ${response.status}\n${errorBody}`
    );
  }

  const book =
    (await response.json()) as
      GoogleBooksVolume;

  const description =
    normalizeBookDescription(
      book.volumeInfo?.description
    );

  bookDescriptionCache.set(
    trimmedVolumeId,
    description
  );

  if (description) {
    bookDescriptionSourceCache.set(
      trimmedVolumeId,
      'google-books'
    );
  }

  return description;
}

async function getBookDescriptionForItem(
  item: Top3Item,
  signal?: AbortSignal
): Promise<BookDescriptionResult | null> {
  const volumeId =
    getBookVolumeId(item);

  const itemCacheKey =
    getBookDescriptionCacheKey(
      item
    );

  if (itemCacheKey) {
    const cachedFinalDescription =
      bookDescriptionCache.get(
        itemCacheKey
      );

    const cachedFinalSource =
      bookDescriptionSourceCache.get(
        itemCacheKey
      );

    if (
      cachedFinalDescription &&
      cachedFinalSource
    ) {
      return {
        description:
          cachedFinalDescription,
        source:
          cachedFinalSource,
      };
    }
  }

  if (volumeId) {
    const cachedGoogleDescription =
      getCachedBookDescription(
        volumeId
      );

    const cachedGoogleSource =
      bookDescriptionSourceCache.get(
        volumeId
      );

    if (
      typeof cachedGoogleDescription ===
        'string' &&
      cachedGoogleSource
    ) {
      if (itemCacheKey) {
        bookDescriptionCache.set(
          itemCacheKey,
          cachedGoogleDescription
        );

        bookDescriptionSourceCache.set(
          itemCacheKey,
          cachedGoogleSource
        );
      }

      return {
        description:
          cachedGoogleDescription,
        source:
          cachedGoogleSource,
      };
    }

    if (
      cachedGoogleDescription !== null &&
      !isGoogleBookDescriptionQuotaExhausted
    ) {
      try {
        const googleDescription =
          await getGoogleBookDescription(
            volumeId,
            signal
          );

        if (googleDescription) {
          if (itemCacheKey) {
            bookDescriptionCache.set(
              itemCacheKey,
              googleDescription
            );

            bookDescriptionSourceCache.set(
              itemCacheKey,
              'google-books'
            );
          }

          return {
            description:
              googleDescription,
            source:
              'google-books',
          };
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'AbortError'
        ) {
          throw error;
        }

        if (__DEV__) {
          console.log(
            'Google Books description unavailable. Using Open Library.',
            error
          );
        }
      }
    }
  }

  try {
    const openLibraryDescription =
      await getOpenLibraryBookDescription(
        item,
        signal
      );

    if (!openLibraryDescription) {
      if (itemCacheKey) {
        bookDescriptionCache.set(
          itemCacheKey,
          null
        );
      }

      return null;
    }

    if (itemCacheKey) {
      bookDescriptionCache.set(
        itemCacheKey,
        openLibraryDescription
      );

      bookDescriptionSourceCache.set(
        itemCacheKey,
        'open-library'
      );
    }

    if (volumeId) {
      bookDescriptionCache.set(
        volumeId,
        openLibraryDescription
      );

      bookDescriptionSourceCache.set(
        volumeId,
        'open-library'
      );
    }

    return {
      description:
        openLibraryDescription,
      source:
        'open-library',
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw error;
    }

    if (__DEV__) {
      console.log(
        'Open Library description fallback failed.',
        error
      );
    }

    return null;
  }
}

export async function getBookDescriptionResult(
  item: Top3Item,
  signal?: AbortSignal
): Promise<BookDescriptionResult | null> {
  return getBookDescriptionForItem(
    item,
    signal
  );
}

export async function getBookDescription(
  book: string | Top3Item,
  signal?: AbortSignal
): Promise<string | null> {
  if (typeof book === 'string') {
    return getGoogleBookDescription(
      book,
      signal
    );
  }

  const result =
    await getBookDescriptionForItem(
      book,
      signal
    );

  return result?.description ?? null;
}

async function requestGoogleBooks(
  query: string,
  signal?: AbortSignal,
  maxResults = 10
): Promise<Top3Item[]> {
  const response =
    await fetchWithRetry(
      buildRequestUrl(
        query,
        maxResults
      ),
      signal
    );

  if (!response.ok) {
    const errorBody =
      await response.text();

    throw new Error(
      `Google Books request failed: ${response.status}\n${errorBody}`
    );
  }

  const data =
    (await response.json()) as GoogleBooksResponse;

  return dedupeResults(
    (data.items ?? []).map(
      mapGoogleBook
    )
  );
}

async function searchFallback(
  query: string,
  topic?: string
) {
  const results =
    await searchOpenLibrary(
      query,
      topic
    );

  return rankByTitle(
    results,
    query
  ).slice(0, 10);
}

function createCuratedSuggestionItems(
  topicId: string,
  suggestions: {
    title: string;
    search: string;
  }[]
): Top3Item[] {
  return suggestions.map(
    (suggestion, index) => ({
      id: `curated-book-${topicId}-${index}`,
      title: suggestion.title,
    })
  );
}

function createGeneralCuratedSuggestionItems() {
  const seenTitles =
    new Set<string>();

  const items:
    Top3Item[] = [];

  Object.entries(
    BOOK_SUGGESTIONS
  ).forEach(
    ([topicId, suggestions]) => {
      suggestions.forEach(
        (suggestion, index) => {
          const titleKey =
            normalizeText(
              suggestion.title
            );

          if (
            seenTitles.has(
              titleKey
            )
          ) {
            return;
          }

          seenTitles.add(
            titleKey
          );

          items.push({
            id:
              `curated-book-${topicId}-${index}`,
            title:
              suggestion.title,
          });
        }
      );
    }
  );

  return items;
}

function shuffleItems(
  items: Top3Item[]
) {
  const shuffled = [...items];

  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1)
    );

    [
      shuffled[index],
      shuffled[randomIndex],
    ] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export async function getPopularBooks(
  topic?: string,
  limit = 5,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const normalizedTopic =
    topic?.trim().toLowerCase() ?? '';

  const isGeneralTopic =
    !normalizedTopic ||
    normalizedTopic === 'general';

  if (isGeneralTopic) {
    const generalCuratedItems =
      createGeneralCuratedSuggestionItems();

    return shuffleItems(
      generalCuratedItems
    ).slice(0, limit);
  }

  const curatedSuggestions =
    BOOK_SUGGESTIONS[
      normalizedTopic
    ];

  if (curatedSuggestions) {
    const curatedItems =
      createCuratedSuggestionItems(
        normalizedTopic,
        curatedSuggestions
      );

    return shuffleItems(
      curatedItems
    ).slice(0, limit);
  }

  if (!API_KEY) {
    return [];
  }

  const subject =
    getGoogleBooksSubject(
      topic
    );

  try {
    const pool =
      await requestGoogleBooks(
        `subject:${subject}`,
        signal,
        40
      );

    return shuffleItems(
      pool
    ).slice(0, limit);
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw error;
    }

    if (__DEV__) {
      console.log(
        'Google Books suggestions failed.',
        error
      );
    }

    return [];
  }
}

export async function searchBooks(
  query: string,
  topic?: string,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const trimmedQuery =
    query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (!API_KEY) {
    return searchFallback(
      trimmedQuery,
      topic
    );
  }

  const subject =
    getGoogleBooksSubject(
      topic
    );

  const topicFilter = topic
    ? ` subject:${subject}`
    : '';

  try {
    const titleQueries =
      buildTitleQueries(
        trimmedQuery
      );

    const titleResultGroups =
      await Promise.all(
        titleQueries.map(
          (titleQuery) =>
            requestGoogleBooks(
              titleQuery,
              signal,
              40
            )
        )
      );

    const titleResults =
      rankByTitle(
        dedupeResults(
          titleResultGroups.flat()
        ),
        trimmedQuery
      );

    const broadQuery =
      `${trimmedQuery}${topicFilter}`;

    const broadResults =
      rankByTitle(
        await requestGoogleBooks(
          broadQuery,
          signal,
          40
        ),
        trimmedQuery
      );

    const combinedResults =
      rankByTitle(
        mergeUniqueResults(
          titleResults,
          broadResults
        ),
        trimmedQuery
      );

    const collapsedResults =
      collapseEquivalentEditions(
        combinedResults,
        trimmedQuery
      );

    if (
      collapsedResults.length > 0
    ) {
      return collapsedResults.slice(
        0,
        10
      );
    }

    const authorQuery =
      `inauthor:${trimmedQuery}${topicFilter}`;

    const authorResults =
      dedupeResults(
        await requestGoogleBooks(
          authorQuery,
          signal
        )
      );

    if (
      authorResults.length > 0
    ) {
      return collapseEquivalentEditions(
        authorResults,
        trimmedQuery
      ).slice(
        0,
        10
      );
    }

    return searchFallback(
      trimmedQuery,
      topic
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        'AbortError'
    ) {
      throw error;
    }

    if (__DEV__) {
      console.log(
        'Google Books search failed. Using Open Library.',
        error
      );
    }

    return searchFallback(
      trimmedQuery,
      topic
    );
  }
}
