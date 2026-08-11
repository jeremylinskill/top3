// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  importPKCS8,
  SignJWT,
} from "npm:jose@6.2.3";

type SearchRequestBody = {
  query?: unknown;
  topic?: unknown;
};

type AppleMusicArtwork = {
  url?: string;
  width?: number;
  height?: number;
};

type AppleMusicPreview = {
  url?: string;
};

type AppleMusicSongAttributes = {
  name?: string;
  artistName?: string;
  albumName?: string;
  releaseDate?: string;
  genreNames?: string[];
  artwork?: AppleMusicArtwork;
  previews?: AppleMusicPreview[];
};

type AppleMusicSong = {
  id?: string;
  type?: string;
  attributes?: AppleMusicSongAttributes;
};

type AppleMusicSearchResponse = {
  results?: {
    songs?: {
      data?: AppleMusicSong[];
    };
  };
  errors?: Array<{
    id?: string;
    title?: string;
    detail?: string;
    status?: string;
  }>;
};

type AppleMusicGenre = {
  id?: string;
  type?: string;
  attributes?: {
    name?: string;
  };
};

type AppleMusicGenresResponse = {
  data?: AppleMusicGenre[];
  errors?: Array<{
    id?: string;
    title?: string;
    detail?: string;
    status?: string;
  }>;
};

type AppleMusicChart = {
  chart?: string;
  name?: string;
  orderId?: string;
  data?: AppleMusicSong[];
};

type AppleMusicChartsResponse = {
  results?: {
    songs?: AppleMusicChart[];
  };
  errors?: Array<{
    id?: string;
    title?: string;
    detail?: string;
    status?: string;
  }>;
};

type SongSearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  previewUrl?: string;
};

type RankedSong = SongSearchResult & {
  artistName: string;
  albumName: string;
  releaseDate: string;
  genreNames: string[];
  originalIndex: number;
  score: number;
};

const APPLE_MUSIC_API_BASE_URL =
  "https://api.music.apple.com/v1";

const DEFAULT_STOREFRONT = "ca";

// Fetch a larger candidate pool so ranking and deduplication
// can still return up to 10 useful results.
const APPLE_SEARCH_LIMIT = 25;
const RESULT_LIMIT = 10;
const MAX_QUERY_LENGTH = 100;

const APPLE_CHART_LIMIT = 200;
const CHART_CACHE_TTL_MS =
  30 * 60 * 1000;
const GENRE_CACHE_TTL_MS =
  60 * 60 * 1000;

const GENRE_ALIASES: Record<string, string[]> = {
  folk: [
    "folk",
    "contemporary folk",
  ],
  "hip hop": [
    "hip hop",
    "hip hop rap",
    "rap",
  ],
  latin: [
    "latin",
    "latino",
  ],
  "r and b": [
    "r and b",
    "r and b soul",
    "soul",
  ],
};

const TOKEN_LIFETIME_SECONDS =
  60 * 60 * 12;

const VARIANT_WORDS = new Set([
  "acoustic",
  "alternate",
  "anniversary",
  "bonus",
  "cover",
  "demo",
  "edit",
  "extended",
  "instrumental",
  "live",
  "mix",
  "mixed",
  "remaster",
  "remastered",
  "remix",
  "session",
  "sessions",
  "version",
]);

let cachedDeveloperToken:
  | string
  | null = null;

let cachedDeveloperTokenExpiresAt = 0;

let cachedGenreIdsByName:
  Map<string, string> | null = null;

let cachedGenreIdsExpiresAt = 0;

const cachedSongCharts =
  new Map<
    string,
    {
      songIds: string[];
      expiresAt: number;
    }
  >();

function jsonResponse(
  body: unknown,
  status = 200
): Response {
  return Response.json(
    body,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function getRequiredSecret(
  name: string
): string {
  const value =
    Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(
      `Missing required secret: ${name}`
    );
  }

  return value;
}

function decodePrivateKey(): string {
  const encodedKey =
    getRequiredSecret(
      "APPLE_MUSIC_PRIVATE_KEY_BASE64"
    );

  try {
    return atob(encodedKey);
  } catch {
    throw new Error(
      "Unable to decode the Apple Music private key."
    );
  }
}

async function getDeveloperToken():
  Promise<string> {
  const nowSeconds =
    Math.floor(Date.now() / 1000);

  if (
    cachedDeveloperToken &&
    nowSeconds <
      cachedDeveloperTokenExpiresAt - 60
  ) {
    return cachedDeveloperToken;
  }

  const keyId =
    getRequiredSecret(
      "APPLE_MUSIC_KEY_ID"
    );

  const teamId =
    getRequiredSecret(
      "APPLE_TEAM_ID"
    );

  const privateKeyPem =
    decodePrivateKey();

  const privateKey =
    await importPKCS8(
      privateKeyPem,
      "ES256"
    );

  const expiresAt =
    nowSeconds +
    TOKEN_LIFETIME_SECONDS;

  const token =
    await new SignJWT({})
      .setProtectedHeader({
        alg: "ES256",
        kid: keyId,
      })
      .setIssuer(teamId)
      .setIssuedAt(nowSeconds)
      .setExpirationTime(expiresAt)
      .sign(privateKey);

  cachedDeveloperToken =
    token;

  cachedDeveloperTokenExpiresAt =
    expiresAt;

  return token;
}

function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(
  value: string
): string[] {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}


function getGenreAliases(
  topic: string
): string[] {
  const normalizedTopic =
    normalizeText(topic);

  if (!normalizedTopic) {
    return [];
  }

  return (
    GENRE_ALIASES[normalizedTopic] ?? [
      normalizedTopic,
    ]
  );
}

async function getGenreIdsByName(
  developerToken: string
): Promise<Map<string, string>> {
  const now =
    Date.now();

  if (
    cachedGenreIdsByName &&
    now < cachedGenreIdsExpiresAt
  ) {
    return cachedGenreIdsByName;
  }

  const url =
    new URL(
      `${APPLE_MUSIC_API_BASE_URL}/catalog/${DEFAULT_STOREFRONT}/genres`
    );

  url.searchParams.set(
    "limit",
    String(APPLE_CHART_LIMIT)
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
          Authorization:
            `Bearer ${developerToken}`,
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `Apple Music genre lookup failed with status ${response.status}.`
    );
  }

  const data =
    await response.json() as AppleMusicGenresResponse;

  const genreIdsByName =
    new Map<string, string>();

  for (
    const genre of data.data ?? []
  ) {
    const id =
      genre.id?.trim();

    const name =
      genre.attributes?.name?.trim();

    if (!id || !name) {
      continue;
    }

    genreIdsByName.set(
      normalizeText(name),
      id
    );
  }

  cachedGenreIdsByName =
    genreIdsByName;

  cachedGenreIdsExpiresAt =
    now + GENRE_CACHE_TTL_MS;

  return genreIdsByName;
}

async function resolveGenreId(
  developerToken: string,
  topic?: string
): Promise<string | undefined> {
  const normalizedTopic =
    normalizeText(topic ?? "");

  if (
    !normalizedTopic ||
    normalizedTopic === "general"
  ) {
    return undefined;
  }

  const genreIdsByName =
    await getGenreIdsByName(
      developerToken
    );

  for (
    const alias of getGenreAliases(
      normalizedTopic
    )
  ) {
    const genreId =
      genreIdsByName.get(alias);

    if (genreId) {
      return genreId;
    }
  }

  return undefined;
}

function buildSongChartUrl(
  genreId?: string
): string {
  const url =
    new URL(
      `${APPLE_MUSIC_API_BASE_URL}/catalog/${DEFAULT_STOREFRONT}/charts`
    );

  url.searchParams.set(
    "types",
    "songs"
  );

  url.searchParams.set(
    "chart",
    "most-played"
  );

  url.searchParams.set(
    "limit",
    String(APPLE_CHART_LIMIT)
  );

  if (genreId) {
    url.searchParams.set(
      "genre",
      genreId
    );
  }

  return url.toString();
}

async function getSongChartIds(
  developerToken: string,
  topic?: string
): Promise<string[]> {
  const normalizedTopic =
    normalizeText(topic ?? "") ||
    "general";

  const cacheKey = [
    DEFAULT_STOREFRONT,
    normalizedTopic,
  ].join("|");

  const now =
    Date.now();

  const cachedChart =
    cachedSongCharts.get(
      cacheKey
    );

  if (
    cachedChart &&
    now < cachedChart.expiresAt
  ) {
    return cachedChart.songIds;
  }

  const genreId =
    await resolveGenreId(
      developerToken,
      topic
    );

  const response =
    await fetch(
      buildSongChartUrl(
        genreId
      ),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
          Authorization:
            `Bearer ${developerToken}`,
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `Apple Music chart lookup failed with status ${response.status}.`
    );
  }

  const data =
    await response.json() as AppleMusicChartsResponse;

  const chart =
    data.results
      ?.songs
      ?.find(
        (item) =>
          item.chart ===
          "most-played"
      ) ??
    data.results
      ?.songs
      ?.[0];

  const songIds =
    (chart?.data ?? [])
      .map((song) =>
        song.id?.trim()
      )
      .filter(
        (id): id is string =>
          Boolean(id)
      );

  cachedSongCharts.set(
    cacheKey,
    {
      songIds,
      expiresAt:
        now + CHART_CACHE_TTL_MS,
    }
  );

  return songIds;
}

function getArtworkUrl(
  artwork?: AppleMusicArtwork
): string | undefined {
  const template =
    artwork?.url?.trim();

  if (!template) {
    return undefined;
  }

  return template
    .replace("{w}", "300")
    .replace("{h}", "300");
}

function mapSong(
  song: AppleMusicSong,
  originalIndex: number
): RankedSong | null {
  const id =
    song.id?.trim();

  const title =
    song.attributes?.name?.trim();

  if (!id || !title) {
    return null;
  }

  const artistName =
    song.attributes
      ?.artistName
      ?.trim() ?? "";

  const albumName =
    song.attributes
      ?.albumName
      ?.trim() ?? "";

  const releaseDate =
    song.attributes
      ?.releaseDate
      ?.trim() ?? "";

  const genreNames =
    song.attributes
      ?.genreNames
      ?.filter(
        (genre): genre is string =>
          typeof genre === "string"
      )
      .map((genre) => genre.trim())
      .filter(Boolean) ?? [];

  return {
    id: `apple-music-song-${id}`,
    title,
    subtitle:
      artistName || undefined,
    imageUrl: getArtworkUrl(
      song.attributes?.artwork
    ),
    previewUrl:
      song.attributes
        ?.previews
        ?.[0]
        ?.url
        ?.trim() || undefined,
    artistName,
    albumName,
    releaseDate,
    genreNames,
    originalIndex,
    score: 0,
  };
}

function songMatchesTopic(
  song: RankedSong,
  topic?: string
): boolean {
  const normalizedTopic =
    normalizeText(topic ?? "");

  if (
    !normalizedTopic ||
    normalizedTopic === "general"
  ) {
    return true;
  }

  const acceptedGenres =
    GENRE_ALIASES[normalizedTopic] ?? [
      normalizedTopic,
    ];

  return song.genreNames.some((genre) => {
    const normalizedGenre =
      normalizeText(genre);

    return acceptedGenres.some(
      (acceptedGenre) =>
        normalizedGenre === acceptedGenre ||
        normalizedGenre.startsWith(
          `${acceptedGenre} `
        )
    );
  });
}

function titleHasVariant(
  title: string
): boolean {
  const words =
    getWords(title);

  return words.some(
    (word) =>
      VARIANT_WORDS.has(word)
  );
}

function queryRequestsVariant(
  query: string
): boolean {
  const words =
    getWords(query);

  return words.some(
    (word) =>
      VARIANT_WORDS.has(word)
  );
}

function getTokenCoverage(
  queryWords: string[],
  searchableWords: Set<string>
): number {
  if (queryWords.length === 0) {
    return 0;
  }

  const matchingWords =
    queryWords.filter(
      (word) =>
        searchableWords.has(word)
    ).length;

  return (
    matchingWords /
    queryWords.length
  );
}

function getSongScore(
  song: RankedSong,
  query: string
): number {
  const normalizedQuery =
    normalizeText(query);

  const normalizedTitle =
    normalizeText(song.title);

  const normalizedArtist =
    normalizeText(
      song.artistName
    );

  const normalizedCombined =
    normalizeText(
      `${song.title} ${song.artistName}`
    );

  const queryWords =
    getWords(query);

  const titleWords =
    new Set(
      getWords(song.title)
    );

  const artistWords =
    new Set(
      getWords(song.artistName)
    );

  const combinedWords =
    new Set([
      ...titleWords,
      ...artistWords,
    ]);

  let score = 0;

  if (
    normalizedCombined ===
    normalizedQuery
  ) {
    score += 1600;
  }

  if (
    normalizedTitle ===
    normalizedQuery
  ) {
    score += 1400;
  } else if (
    normalizedTitle.startsWith(
      normalizedQuery
    )
  ) {
    score += 950;
  } else if (
    normalizedTitle.includes(
      normalizedQuery
    )
  ) {
    score += 700;
  }

  const combinedCoverage =
    getTokenCoverage(
      queryWords,
      combinedWords
    );

  const titleCoverage =
    getTokenCoverage(
      queryWords,
      titleWords
    );

  const artistCoverage =
    getTokenCoverage(
      queryWords,
      artistWords
    );

  score +=
    Math.round(
      combinedCoverage * 700
    );

  score +=
    Math.round(
      titleCoverage * 250
    );

  score +=
    Math.round(
      artistCoverage * 150
    );

  if (
    normalizedArtist &&
    normalizedQuery.includes(
      normalizedArtist
    )
  ) {
    score += 300;
  }

  const isVariant =
    titleHasVariant(song.title);

  if (
    isVariant &&
    !queryRequestsVariant(query)
  ) {
    score -= 250;
  }

  if (!isVariant) {
    score += 100;
  }

  // Preserve Apple's catalogue ordering as a stable
  // tie-breaker while allowing our relevance score
  // to promote stronger matches.
  score -= song.originalIndex;

  return score;
}

function getDeduplicationKey(
  song: RankedSong
): string {
  return [
    normalizeText(song.title),
    normalizeText(song.artistName),
  ].join("|");
}

function getVariantGroupKey(
  song: RankedSong
): string {
  const baseTitle =
    normalizeText(
      song.title
        .split(/[[(]/, 1)[0]
    );

  return [
    baseTitle,
    normalizeText(song.artistName),
  ].join("|");
}

function rankAndDeduplicateSongs(
  songs: RankedSong[],
  query: string,
  chartSongIds: string[] = []
): SongSearchResult[] {
  const chartPositions =
    new Map<string, number>();

  chartSongIds.forEach(
    (songId, index) => {
      chartPositions.set(
        songId,
        index + 1
      );
    }
  );

  const rankedSongs =
    songs
      .map((song) => {
        const appleSongId =
          song.id.replace(
            /^apple-music-song-/,
            ""
          );

        const chartPosition =
          chartPositions.get(
            appleSongId
          );

        let popularityBoost = 0;

        if (
          chartPosition !== undefined
        ) {
          if (chartPosition <= 10) {
            popularityBoost = 350;
          } else if (
            chartPosition <= 50
          ) {
            popularityBoost = 225;
          } else if (
            chartPosition <= 200
          ) {
            popularityBoost = 100;
          }
        }

        return {
          ...song,
          score:
            getSongScore(
              song,
              query
            ) +
            popularityBoost,
        };
      })
      .sort((first, second) => {
        if (
          second.score !==
          first.score
        ) {
          return (
            second.score -
            first.score
          );
        }

        return (
          first.originalIndex -
          second.originalIndex
        );
      });

  const seenKeys =
    new Set<string>();

  const variantCounts =
    new Map<string, number>();

  const allowUnlimitedVariants =
    queryRequestsVariant(query);

  const results:
    SongSearchResult[] = [];

  for (
    const song of rankedSongs
  ) {
    const deduplicationKey =
      getDeduplicationKey(song);

    if (
      seenKeys.has(
        deduplicationKey
      )
    ) {
      continue;
    }

    const variantGroupKey =
      getVariantGroupKey(song);

    const currentVariantCount =
      variantCounts.get(
        variantGroupKey
      ) ?? 0;

    if (
      !allowUnlimitedVariants &&
      currentVariantCount >= 3
    ) {
      continue;
    }

    seenKeys.add(
      deduplicationKey
    );

    variantCounts.set(
      variantGroupKey,
      currentVariantCount + 1
    );

    results.push({
      id: song.id,
      title: song.title,
      subtitle: song.subtitle,
      imageUrl: song.imageUrl,
      previewUrl: song.previewUrl,
    });

    if (
      results.length >=
      RESULT_LIMIT
    ) {
      break;
    }
  }

  return results;
}

function buildSearchUrl(
  query: string
): string {
  const url =
    new URL(
      `${APPLE_MUSIC_API_BASE_URL}/catalog/${DEFAULT_STOREFRONT}/search`
    );

  url.searchParams.set(
    "term",
    query
  );

  url.searchParams.set(
    "types",
    "songs"
  );

  url.searchParams.set(
    "limit",
    String(APPLE_SEARCH_LIMIT)
  );

  return url.toString();
}

async function searchAppleMusicSongs(
  query: string,
  topic?: string
): Promise<SongSearchResult[]> {
  const developerToken =
    await getDeveloperToken();

  const response =
    await fetch(
      buildSearchUrl(query),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
          Authorization:
            `Bearer ${developerToken}`,
        },
      }
    );

  const responseText =
    await response.text();

  let data:
    | AppleMusicSearchResponse
    | null = null;

  if (responseText) {
    try {
      data =
        JSON.parse(
          responseText
        ) as AppleMusicSearchResponse;
    } catch {
      console.error(
        "Apple Music returned a non-JSON response:",
        response.status,
        responseText
      );
    }
  }

  if (!response.ok) {
    console.error(
      "Apple Music search failed:",
      response.status,
      data ?? responseText
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw new Error(
        "Apple Music authentication failed."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "Apple Music is temporarily rate limited."
      );
    }

    throw new Error(
      `Apple Music search failed with status ${response.status}.`
    );
  }

  const songs =
    data?.results
      ?.songs
      ?.data ?? [];

  const mappedSongs =
    songs
      .map(
        (
          song,
          originalIndex
        ) =>
          mapSong(
            song,
            originalIndex
          )
      )
      .filter(
        (
          song
        ): song is RankedSong =>
          song !== null
      );

  const topicFilteredSongs =
    mappedSongs.filter((song) =>
      songMatchesTopic(
        song,
        topic
      )
    );

  let chartSongIds: string[] = [];

  try {
    chartSongIds =
      await getSongChartIds(
        developerToken,
        topic
      );
  } catch (error) {
    console.warn(
      "Apple Music chart lookup failed; continuing without popularity boost:",
      error
    );
  }

  return rankAndDeduplicateSongs(
    topicFilteredSongs,
    query,
    chartSongIds
  );
}

export default {
  fetch: withSupabase(
    {
      auth: [
        "publishable",
        "secret",
      ],
    },
    async (request) => {
      if (
        request.method !== "POST"
      ) {
        return jsonResponse(
          {
            error:
              "Method not allowed.",
          },
          405
        );
      }

      let body:
        SearchRequestBody;

      try {
        body =
          (await request.json()) as SearchRequestBody;
      } catch {
        return jsonResponse(
          {
            error:
              "Invalid request body.",
          },
          400
        );
      }

      if (
        typeof body.query !==
        "string"
      ) {
        return jsonResponse(
          {
            error:
              "A song search query is required.",
          },
          400
        );
      }

      const query =
        body.query.trim();

      const topic =
        typeof body.topic === "string"
          ? body.topic.trim()
          : undefined;

      if (!query) {
        return jsonResponse(
          {
            error:
              "A song search query is required.",
          },
          400
        );
      }

      if (
        query.length >
        MAX_QUERY_LENGTH
      ) {
        return jsonResponse(
          {
            error:
              `Search queries must be ${MAX_QUERY_LENGTH} characters or fewer.`,
          },
          400
        );
      }

      try {
        const results =
          await searchAppleMusicSongs(
            query,
            topic
          );

        return jsonResponse({
          results,
        });
      } catch (error) {
        console.error(
          "Apple Music Edge Function failed:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "Apple Music search is temporarily unavailable.";

        return jsonResponse(
          {
            error: message,
          },
          502
        );
      }
    }
  ),
};