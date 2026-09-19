import { Top3Item } from '@/types/top3-item';

type ApplePodcastSearchResult = {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  collectionViewUrl?: string;
  feedUrl?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
  primaryGenreName?: string;
  genres?: string[];
};

type ApplePodcastSearchResponse = {
  results?: ApplePodcastSearchResult[];
};

type ApplePodcastChartResult = {
  id?: string;
  name?: string;
  artistName?: string;
  artworkUrl100?: string;
  url?: string;
};

type ApplePodcastChartResponse = {
  feed?: {
    results?: ApplePodcastChartResult[];
  };
};

type ApplePodcastEpisodeResult = {
  collectionId?: number;
  collectionViewUrl?: string;
  episodeUrl?: string;
  feedUrl?: string;
  releaseDate?: string;
  trackName?: string;
  trackViewUrl?: string;
};

type ApplePodcastLookupResponse = {
  results?: ApplePodcastEpisodeResult[];
};

export type PodcastEpisodePreview = {
  audioUrl: string;
  applePodcastsUrl?: string;
  feedUrl?: string;
};

const ITUNES_SEARCH_URL =
  'https://itunes.apple.com/search';

const ITUNES_LOOKUP_URL =
  'https://itunes.apple.com/lookup';

const APPLE_PODCASTS_CHART_URL =
  'https://rss.marketingtools.apple.com/api/v2/ca/podcasts/top/50/podcasts.json';

const RETRYABLE_STATUS_CODES =
  new Set([
    429,
    500,
    502,
    503,
    504,
  ]);

const MAX_ATTEMPTS = 3;

const podcastEpisodePreviewCache =
  new Map<string, PodcastEpisodePreview | null>();

const podcastDescriptionCache =
  new Map<string, string | null>();

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

        reject(
          createAbortError()
        );
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
      ? Number(
          retryAfterHeader
        )
      : Number.NaN;

  const delayMilliseconds =
    Number.isFinite(
      retryAfterSeconds
    )
      ? retryAfterSeconds *
        1000
      : 500 *
        2 ** (attempt - 1);

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

function normalizeText(
  value: string
) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[^a-z0-9\s]/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function upgradeArtworkUrl(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const secureUrl =
    value.replace(
      'http://',
      'https://'
    );

  return secureUrl.replace(
    /\/\d+x\d+bb\./,
    '/600x600bb.'
  );
}

function normalizePodcastFeedUrl(
  value?: string
) {
  const trimmedUrl =
    value?.trim();

  if (!trimmedUrl) {
    return undefined;
  }

  return trimmedUrl.replace(
    /^http:\/\//i,
    'https://'
  );
}

function decodeXmlEntities(
  value: string
) {
  const namedEntities: Record<
    string,
    string
  > = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity: string) => {
      if (
        entity.startsWith('#x') ||
        entity.startsWith('#X')
      ) {
        const codePoint =
          Number.parseInt(
            entity.slice(2),
            16
          );

        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : match;
      }

      if (entity.startsWith('#')) {
        const codePoint =
          Number.parseInt(
            entity.slice(1),
            10
          );

        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : match;
      }

      return (
        namedEntities[
          entity.toLowerCase()
        ] ?? match
      );
    }
  );
}

function cleanPodcastDescription(
  value: string
) {
  return decodeXmlEntities(
    value
      .replace(
        /^<!\[CDATA\[([\s\S]*)\]\]>$/i,
        '$1'
      )
  )
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPodcastDescription(
  xml: string
): string | null {
  const channelMatch =
    /<channel\b[^>]*>([\s\S]*?)<\/channel>/i.exec(
      xml
    );

  if (!channelMatch?.[1]) {
    return null;
  }

  const channelMetadata =
    channelMatch[1].replace(
      /<item\b[^>]*>[\s\S]*?<\/item>/gi,
      ''
    );

  const tagNames = [
    'description',
    'itunes:summary',
    'content:encoded',
  ];

  for (const tagName of tagNames) {
    const escapedTagName =
      tagName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

    const tagPattern =
      new RegExp(
        `<${escapedTagName}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`,
        'i'
      );

    const match =
      tagPattern.exec(
        channelMetadata
      );

    const description =
      match?.[1]
        ? cleanPodcastDescription(
            match[1]
          )
        : '';

    if (description) {
      return description;
    }
  }

  return null;
}

function buildApplePodcastsShowUrl(
  podcastId: string
) {
  return `https://podcasts.apple.com/ca/podcast/id${podcastId}`;
}

function getApplePodcastsShowUrl(
  podcastId: string,
  candidateUrl?: string
) {
  const trimmedUrl =
    candidateUrl?.trim();

  if (
    trimmedUrl &&
    trimmedUrl.includes(
      `/id${podcastId}`
    )
  ) {
    return trimmedUrl;
  }

  return buildApplePodcastsShowUrl(
    podcastId
  );
}

function mapSearchResult(
  result: ApplePodcastSearchResult
): Top3Item | null {
  const id =
    result.collectionId;

  const title =
    result.collectionName?.trim();

  if (
    typeof id !== 'number' ||
    !title
  ) {
    return null;
  }

  const subtitle =
    result.artistName?.trim();

  return {
    id: `apple-podcast-${id}`,
    title,
    subtitle:
      subtitle || undefined,
    applePodcastId:
      String(id),
    applePodcastsUrl:
      getApplePodcastsShowUrl(
        String(id),
        result.collectionViewUrl
      ),
    podcastFeedUrl:
      normalizePodcastFeedUrl(
        result.feedUrl
      ),
    imageUrl:
      upgradeArtworkUrl(
        result.artworkUrl600 ??
          result.artworkUrl100 ??
          result.artworkUrl60
      ),
  };
}

function mapChartResult(
  result: ApplePodcastChartResult
): Top3Item | null {
  const id =
    result.id?.trim();

  const title =
    result.name?.trim();

  if (!id || !title) {
    return null;
  }

  const subtitle =
    result.artistName?.trim();

  return {
    id: `apple-podcast-${id}`,
    title,
    subtitle:
      subtitle || undefined,
    applePodcastId:
      id,
    applePodcastsUrl:
      getApplePodcastsShowUrl(
        id,
        result.url
      ),
    imageUrl:
      upgradeArtworkUrl(
        result.artworkUrl100
      ),
  };
}

function dedupeItems(
  items: Top3Item[]
) {
  const seenIds =
    new Set<string>();

  const seenMetadata =
    new Set<string>();

  return items.filter(
    (item) => {
      const metadataKey =
        `${normalizeText(
          item.title
        )}|${normalizeText(
          item.subtitle ?? ''
        )}`;

      if (
        seenIds.has(item.id) ||
        seenMetadata.has(
          metadataKey
        )
      ) {
        return false;
      }

      seenIds.add(item.id);

      seenMetadata.add(
        metadataKey
      );

      return true;
    }
  );
}

function getTitleScore(
  title: string,
  query: string
) {
  const normalizedTitle =
    normalizeText(title);

  const normalizedQuery =
    normalizeText(query);

  if (!normalizedQuery) {
    return 0;
  }

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

function matchesTopic(
  result: ApplePodcastSearchResult,
  topic?: string
) {
  const normalizedTopic =
    normalizeText(
      topic ?? ''
    );

  if (
    !normalizedTopic ||
    normalizedTopic ===
      'general'
  ) {
    return false;
  }

  const genres = [
    result.primaryGenreName,
    ...(result.genres ?? []),
  ]
    .filter(
      (
        genre
      ): genre is string =>
        Boolean(genre)
    )
    .map(normalizeText);

  return genres.some(
    (genre) =>
      genre ===
        normalizedTopic ||
      genre.includes(
        normalizedTopic
      ) ||
      normalizedTopic.includes(
        genre
      )
  );
}

function rankSearchResults(
  results: ApplePodcastSearchResult[],
  query: string,
  topic?: string
) {
  return results
    .map(
      (
        result,
        originalIndex
      ) => ({
        result,
        originalIndex,
        score:
          getTitleScore(
            result.collectionName ??
              '',
            query
          ) +
          (matchesTopic(
            result,
            topic
          )
            ? 100
            : 0),
      })
    )
    .sort((a, b) => {
      if (
        b.score !== a.score
      ) {
        return (
          b.score -
          a.score
        );
      }

      return (
        a.originalIndex -
        b.originalIndex
      );
    })
    .map(
      ({ result }) =>
        result
    );
}

function getPodcastId(
  item: Top3Item
): string | null {
  const explicitId =
    item.applePodcastId?.trim();

  if (explicitId) {
    return explicitId;
  }

  const itemIdMatch =
    /^apple-podcast-(\d+)$/.exec(
      item.id
    );

  return itemIdMatch?.[1] ?? null;
}

function getReleaseTimestamp(
  value?: string
) {
  if (!value) {
    return 0;
  }

  const timestamp =
    Date.parse(value);

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

async function requestPodcastLookup(
  podcastId: string,
  signal?: AbortSignal
) {
  const params =
    new URLSearchParams({
      id: podcastId,
      country: 'ca',
      media: 'podcast',
      entity: 'podcastEpisode',
      limit: '20',
    });

  const response =
    await fetchWithRetry(
      `${ITUNES_LOOKUP_URL}?${params.toString()}`,
      signal
    );

  if (!response.ok) {
    throw new Error(
      `Apple Podcasts episode lookup failed with status ${response.status}.`
    );
  }

  const payload =
    await response.json() as ApplePodcastLookupResponse;

  return payload.results ?? [];
}

async function requestPodcastSearch(
  query: string,
  signal?: AbortSignal,
  limit = 50
) {
  const params =
    new URLSearchParams({
      term: query,
      country: 'ca',
      media: 'podcast',
      entity: 'podcast',
      limit: String(limit),
    });

  const response =
    await fetchWithRetry(
      `${ITUNES_SEARCH_URL}?${params.toString()}`,
      signal
    );

  if (!response.ok) {
    throw new Error(
      `Apple Podcasts search failed with status ${response.status}.`
    );
  }

  const payload =
    await response.json() as ApplePodcastSearchResponse;

  return payload.results ?? [];
}

async function requestTopPodcastChart(
  signal?: AbortSignal
) {
  const response =
    await fetchWithRetry(
      APPLE_PODCASTS_CHART_URL,
      signal
    );

  if (!response.ok) {
    throw new Error(
      `Apple Podcasts chart request failed with status ${response.status}.`
    );
  }

  const payload =
    await response.json() as ApplePodcastChartResponse;

  return payload.feed?.results ??
    [];
}

export async function getPodcastDescription(
  feedUrl: string,
  signal?: AbortSignal
): Promise<string | null> {
  const normalizedFeedUrl =
    normalizePodcastFeedUrl(
      feedUrl
    );

  if (!normalizedFeedUrl) {
    return null;
  }

  if (
    podcastDescriptionCache.has(
      normalizedFeedUrl
    )
  ) {
    return (
      podcastDescriptionCache.get(
        normalizedFeedUrl
      ) ?? null
    );
  }

  const response =
    await fetchWithRetry(
      normalizedFeedUrl,
      signal
    );

  if (!response.ok) {
    throw new Error(
      `Podcast feed request failed with status ${response.status}.`
    );
  }

  const xml =
    await response.text();

  const description =
    extractPodcastDescription(xml);

  podcastDescriptionCache.set(
    normalizedFeedUrl,
    description
  );

  return description;
}

export async function getPodcastEpisodePreview(
  item: Top3Item,
  signal?: AbortSignal
): Promise<PodcastEpisodePreview | null> {
  const podcastId =
    getPodcastId(item);

  if (!podcastId) {
    return null;
  }

  if (
    podcastEpisodePreviewCache.has(
      podcastId
    )
  ) {
    return (
      podcastEpisodePreviewCache.get(
        podcastId
      ) ?? null
    );
  }

  const results =
    await requestPodcastLookup(
      podcastId,
      signal
    );

  const playableEpisodes =
    results
      .filter(
        (result) =>
          Boolean(
            result.episodeUrl?.trim()
          )
      )
      .sort(
        (a, b) =>
          getReleaseTimestamp(
            b.releaseDate
          ) -
          getReleaseTimestamp(
            a.releaseDate
          )
      );

  const episode =
    playableEpisodes[0];

  const feedUrl =
    normalizePodcastFeedUrl(
      results.find(
        (result) =>
          Boolean(
            result.feedUrl?.trim()
          )
      )?.feedUrl
    );

  if (!episode?.episodeUrl) {
    podcastEpisodePreviewCache.set(
      podcastId,
      null
    );

    return null;
  }

  const preview: PodcastEpisodePreview = {
    audioUrl:
      episode.episodeUrl.trim(),
    applePodcastsUrl:
      getApplePodcastsShowUrl(
        podcastId,
        item.applePodcastsUrl
      ),
    feedUrl:
      feedUrl || undefined,
  };

  podcastEpisodePreviewCache.set(
    podcastId,
    preview
  );

  return preview;
}

export async function searchPodcasts(
  query: string,
  topic?: string,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const trimmedQuery =
    query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const results =
    await requestPodcastSearch(
      trimmedQuery,
      signal,
      50
    );

  const rankedResults =
    rankSearchResults(
      results,
      trimmedQuery,
      topic
    );

  return dedupeItems(
    rankedResults
      .map(mapSearchResult)
      .filter(
        (
          item
        ): item is Top3Item =>
          item !== null
      )
  ).slice(0, 10);
}

export async function getPopularPodcasts(
  topic?: string,
  limit = 20,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const normalizedTopic =
    normalizeText(
      topic ?? ''
    );

  const isGeneralTopic =
    !normalizedTopic ||
    normalizedTopic ===
      'general';

  try {
    if (isGeneralTopic) {
      const chartResults =
        await requestTopPodcastChart(
          signal
        );

      return dedupeItems(
        chartResults
          .map(mapChartResult)
          .filter(
            (
              item
            ): item is Top3Item =>
              item !== null
          )
      ).slice(0, limit);
    }

    const topicResults =
      await requestPodcastSearch(
        `${topic} podcast`,
        signal,
        50
      );

    const matchingResults =
      topicResults.filter(
        (result) =>
          matchesTopic(
            result,
            topic
          )
      );

    const sourceResults =
      matchingResults.length > 0
        ? matchingResults
        : topicResults;

    return dedupeItems(
      sourceResults
        .map(mapSearchResult)
        .filter(
          (
            item
          ): item is Top3Item =>
            item !== null
        )
    ).slice(0, limit);
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
        'Apple Podcasts suggestions failed.',
        error
      );
    }

    return [];
  }
}