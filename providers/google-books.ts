import { BOOK_SUGGESTIONS } from '@/constants/book-suggestions';
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

const API_BASE_URL =
  'https://www.googleapis.com/books/v1/volumes';

const API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

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

    console.warn(
      'Google Books suggestions failed.',
      error
    );

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

    console.warn(
      'Google Books search failed. Using Open Library.',
      error
    );

    return searchFallback(
      trimmedQuery,
      topic
    );
  }
}