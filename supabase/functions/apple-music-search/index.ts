// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  importPKCS8,
  SignJWT,
} from "npm:jose@6.2.3";

type SearchRequestBody = {
  mode?: unknown;
  resource?: unknown;
  query?: unknown;
  topic?: unknown;
  limit?: unknown;
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

type AppleMusicAlbumAttributes = {
  name?: string;
  artistName?: string;
  releaseDate?: string;
  genreNames?: string[];
  artwork?: AppleMusicArtwork;
};

type AppleMusicAlbumRelationships = {
  tracks?: {
    data?: AppleMusicSong[];
  };
};

type AppleMusicAlbum = {
  id?: string;
  type?: string;
  attributes?: AppleMusicAlbumAttributes;
  relationships?: AppleMusicAlbumRelationships;
};

type AppleMusicArtistAttributes = {
  name?: string;
  genreNames?: string[];
  artwork?: AppleMusicArtwork;
};

type AppleMusicArtist = {
  id?: string;
  type?: string;
  attributes?: AppleMusicArtistAttributes;
};

type AppleMusicResource =
  | "albums"
  | "artists"
  | "songs";

type AppleMusicSearchResponse = {
  results?: {
    albums?: {
      data?: AppleMusicAlbum[];
    };
    artists?: {
      data?: AppleMusicArtist[];
    };
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

type AppleMusicSongChart = {
  chart?: string;
  name?: string;
  orderId?: string;
  data?: AppleMusicSong[];
};

type AppleMusicAlbumChart = {
  chart?: string;
  name?: string;
  orderId?: string;
  data?: AppleMusicAlbum[];
};

type AppleMusicChartsResponse = {
  results?: {
    albums?: AppleMusicAlbumChart[];
    songs?: AppleMusicSongChart[];
  };
  errors?: Array<{
    id?: string;
    title?: string;
    detail?: string;
    status?: string;
  }>;
};

type AppleMusicTopResultSuggestion = {
  kind?: string;
  content?: AppleMusicArtist;
};

type AppleMusicSearchSuggestionsResponse = {
  results?: {
    suggestions?: AppleMusicTopResultSuggestion[];
  };
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

type AlbumSearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  previewUrl?: string;
};

type RankedAlbum = AlbumSearchResult & {
  artistName: string;
  releaseDate: string;
  genreNames: string[];
  originalIndex: number;
  score: number;
};

type ArtistSearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  previewUrl?: string;
};

type RankedArtist = ArtistSearchResult & {
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
const MAX_POPULAR_RESULT_LIMIT = 50;

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
      songs: AppleMusicSong[];
      expiresAt: number;
    }
  >();

const cachedAlbumCharts =
  new Map<
    string,
    {
      albumIds: string[];
      albums: AppleMusicAlbum[];
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

  const chartSongs =
    chart?.data ?? [];

  const songIds =
    chartSongs
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
      songs: chartSongs,
      expiresAt:
        now + CHART_CACHE_TTL_MS,
    }
  );

  return songIds;
}


function buildAlbumChartUrl(
  genreId?: string
): string {
  const url =
    new URL(
      `${APPLE_MUSIC_API_BASE_URL}/catalog/${DEFAULT_STOREFRONT}/charts`
    );

  url.searchParams.set(
    "types",
    "albums"
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

async function getAlbumChartIds(
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
    cachedAlbumCharts.get(
      cacheKey
    );

  if (
    cachedChart &&
    now < cachedChart.expiresAt
  ) {
    return cachedChart.albumIds;
  }

  const genreId =
    await resolveGenreId(
      developerToken,
      topic
    );

  const response =
    await fetch(
      buildAlbumChartUrl(
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
      `Apple Music album chart lookup failed with status ${response.status}.`
    );
  }

  const data =
    await response.json() as AppleMusicChartsResponse;

  const chart =
    data.results
      ?.albums
      ?.find(
        (item) =>
          item.chart ===
          "most-played"
      ) ??
    data.results
      ?.albums
      ?.[0];

  const chartAlbums =
    chart?.data ?? [];

  const albumIds =
    chartAlbums
      .map((album) =>
        album.id?.trim()
      )
      .filter(
        (id): id is string =>
          Boolean(id)
      );

  cachedAlbumCharts.set(
    cacheKey,
    {
      albumIds,
      albums: chartAlbums,
      expiresAt:
        now + CHART_CACHE_TTL_MS,
    }
  );

  return albumIds;
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


function getRepresentativeAlbumPreviewUrl(
  album: AppleMusicAlbum,
  chartSongIds: string[] = []
): string | undefined {
  const tracks =
    album.relationships
      ?.tracks
      ?.data ?? [];

  const tracksWithPreviews =
    tracks
      .map((track) => {
        const id =
          track.id?.trim();

        const previewUrl =
          track.attributes
            ?.previews
            ?.[0]
            ?.url
            ?.trim();

        if (
          !id ||
          !previewUrl
        ) {
          return null;
        }

        return {
          id,
          previewUrl,
        };
      })
      .filter(
        (
          track
        ): track is {
          id: string;
          previewUrl: string;
        } =>
          track !== null
      );

  if (
    tracksWithPreviews.length === 0
  ) {
    return undefined;
  }

  const chartPositions =
    new Map<string, number>();

  chartSongIds.forEach(
    (songId, index) => {
      chartPositions.set(
        songId,
        index
      );
    }
  );

  const chartedTracks =
    tracksWithPreviews
      .map((track) => ({
        ...track,
        chartPosition:
          chartPositions.get(
            track.id
          ),
      }))
      .filter(
        (
          track
        ): track is {
          id: string;
          previewUrl: string;
          chartPosition: number;
        } =>
          track.chartPosition !==
          undefined
      )
      .sort(
        (first, second) =>
          first.chartPosition -
          second.chartPosition
      );

  return (
    chartedTracks[0]
      ?.previewUrl ??
    tracksWithPreviews[0]
      ?.previewUrl
  );
}

function mapAlbum(
  album: AppleMusicAlbum,
  originalIndex: number,
  chartSongIds: string[] = []
): RankedAlbum | null {
  const id =
    album.id?.trim();

  const title =
    album.attributes?.name?.trim();

  if (!id || !title) {
    return null;
  }

  const artistName =
    album.attributes
      ?.artistName
      ?.trim() ?? "";

  const releaseDate =
    album.attributes
      ?.releaseDate
      ?.trim() ?? "";

  const genreNames =
    album.attributes
      ?.genreNames
      ?.filter(
        (genre): genre is string =>
          typeof genre === "string"
      )
      .map((genre) => genre.trim())
      .filter(Boolean) ?? [];

  return {
    id: `apple-music-album-${id}`,
    title,
    subtitle:
      artistName || undefined,
    imageUrl: getArtworkUrl(
      album.attributes?.artwork
    ),
    previewUrl:
      getRepresentativeAlbumPreviewUrl(
        album,
        chartSongIds
      ),
    artistName,
    releaseDate,
    genreNames,
    originalIndex,
    score: 0,
  };
}

function mapArtist(
  artist: AppleMusicArtist,
  originalIndex: number,
  previewUrl?: string
): RankedArtist | null {
  const id =
    artist.id?.trim();

  const title =
    artist.attributes?.name?.trim();

  if (!id || !title) {
    return null;
  }

  const genreNames =
    artist.attributes
      ?.genreNames
      ?.filter(
        (genre): genre is string =>
          typeof genre === "string"
      )
      .map((genre) => genre.trim())
      .filter(Boolean) ?? [];

  const subtitle =
    genreNames
      .filter(
        (genre) =>
          normalizeText(genre) !== "music"
      )
      .slice(0, 2)
      .join(" · ");

  return {
    id: `apple-music-artist-${id}`,
    title,
    subtitle:
      subtitle || undefined,
    imageUrl: getArtworkUrl(
      artist.attributes?.artwork
    ),
    previewUrl,
    genreNames,
    originalIndex,
    score: 0,
  };
}

function genreNamesMatchTopic(
  genreNames: string[],
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

  return genreNames.some((genre) => {
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

function albumMatchesTopic(
  album: RankedAlbum,
  topic?: string
): boolean {
  return genreNamesMatchTopic(
    album.genreNames,
    topic
  );
}

function artistMatchesTopic(
  artist: RankedArtist,
  topic?: string
): boolean {
  return genreNamesMatchTopic(
    artist.genreNames,
    topic
  );
}

function songMatchesTopic(
  song: RankedSong,
  topic?: string
): boolean {
  return genreNamesMatchTopic(
    song.genreNames,
    topic
  );
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


function getResourceScore(
  title: string,
  subtitle: string,
  query: string,
  originalIndex: number
): number {
  const normalizedQuery =
    normalizeText(query);

  const normalizedTitle =
    normalizeText(title);

  const normalizedSubtitle =
    normalizeText(subtitle);

  const normalizedCombined =
    normalizeText(
      `${title} ${subtitle}`
    );

  const queryWords =
    getWords(query);

  const titleWords =
    new Set(
      getWords(title)
    );

  const subtitleWords =
    new Set(
      getWords(subtitle)
    );

  const combinedWords =
    new Set([
      ...titleWords,
      ...subtitleWords,
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

  score +=
    Math.round(
      getTokenCoverage(
        queryWords,
        combinedWords
      ) * 700
    );

  score +=
    Math.round(
      getTokenCoverage(
        queryWords,
        titleWords
      ) * 250
    );

  score +=
    Math.round(
      getTokenCoverage(
        queryWords,
        subtitleWords
      ) * 150
    );

  if (
    normalizedSubtitle &&
    normalizedQuery.includes(
      normalizedSubtitle
    )
  ) {
    score += 300;
  }

  score -= originalIndex;

  return score;
}

async function getArtistTopResults(
  developerToken: string,
  query: string
): Promise<AppleMusicArtist[]> {
  const url =
    new URL(
      `${APPLE_MUSIC_API_BASE_URL}/catalog/${DEFAULT_STOREFRONT}/search/suggestions`
    );

  url.searchParams.set(
    "term",
    query
  );

  url.searchParams.set(
    "kinds",
    "topResults"
  );

  url.searchParams.set(
    "types",
    "artists"
  );

  url.searchParams.set(
    "limit",
    "10"
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
      `Apple Music artist top-results lookup failed with status ${response.status}.`
    );
  }

  const data =
    await response.json() as AppleMusicSearchSuggestionsResponse;

  return (
    data.results
      ?.suggestions ?? []
  )
    .filter(
      (suggestion) =>
        suggestion.kind ===
          "topResults" &&
        suggestion.content?.type ===
          "artists"
    )
    .map(
      (suggestion) =>
        suggestion.content
    )
    .filter(
      (
        artist
      ): artist is AppleMusicArtist =>
        Boolean(
          artist?.id?.trim() &&
          artist.attributes?.name?.trim()
        )
    );
}

async function getAlbumTopResultIds(
  developerToken: string,
  query: string
): Promise<string[]> {
  const url =
    new URL(
      `${APPLE_MUSIC_API_BASE_URL}/catalog/${DEFAULT_STOREFRONT}/search/suggestions`
    );

  url.searchParams.set(
    "term",
    query
  );

  url.searchParams.set(
    "kinds",
    "topResults"
  );

  url.searchParams.set(
    "types",
    "albums"
  );

  url.searchParams.set(
    "limit",
    "10"
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
      `Apple Music album top-results lookup failed with status ${response.status}.`
    );
  }

  const data =
    await response.json() as AppleMusicSearchSuggestionsResponse;

  return (
    data.results
      ?.suggestions ?? []
  )
    .filter(
      (suggestion) =>
        suggestion.kind ===
          "topResults" &&
        suggestion.content?.type ===
          "albums"
    )
    .map(
      (suggestion) =>
        suggestion.content
          ?.id
          ?.trim()
    )
    .filter(
      (id): id is string =>
        Boolean(id)
    );
}

function rankAndDeduplicateAlbums(
  albums: RankedAlbum[],
  query: string,
  chartAlbumIds: string[] = [],
  topResultAlbumIds: string[] = []
): AlbumSearchResult[] {
  const chartPositions =
    new Map<string, number>();

  chartAlbumIds.forEach(
    (albumId, index) => {
      chartPositions.set(
        albumId,
        index + 1
      );
    }
  );

  const topResultPositions =
    new Map<string, number>();

  topResultAlbumIds.forEach(
    (albumId, index) => {
      topResultPositions.set(
        albumId,
        index + 1
      );
    }
  );

  const rankedAlbums =
    albums
      .map((album) => {
        const appleAlbumId =
          album.id.replace(
            /^apple-music-album-/,
            ""
          );

        const chartPosition =
          chartPositions.get(
            appleAlbumId
          );

        const topResultPosition =
          topResultPositions.get(
            appleAlbumId
          );

        let popularityBoost = 0;

        if (
          chartPosition !== undefined
        ) {
          if (chartPosition <= 10) {
            popularityBoost = 1200;
          } else if (
            chartPosition <= 25
          ) {
            popularityBoost = 900;
          } else if (
            chartPosition <= 50
          ) {
            popularityBoost = 650;
          } else if (
            chartPosition <= 100
          ) {
            popularityBoost = 400;
          } else if (
            chartPosition <= 200
          ) {
            popularityBoost = 200;
          }
        }

        const exactTitleBoost =
          normalizeText(album.title) ===
          normalizeText(query)
            ? 450
            : 0;

        const canonicalResultBoost =
          topResultPosition === undefined
            ? 0
            : Math.max(
                1400,
                3200 -
                  (
                    topResultPosition -
                    1
                  ) *
                    300
              );

        return {
          ...album,
          score:
            getResourceScore(
              album.title,
              album.artistName,
              query,
              album.originalIndex
            ) +
            exactTitleBoost +
            canonicalResultBoost +
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

  const results:
    AlbumSearchResult[] = [];

  for (
    const album of rankedAlbums
  ) {
    const key = [
      normalizeText(album.title),
      normalizeText(
        album.artistName
      ),
    ].join("|");

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);

    results.push({
      id: album.id,
      title: album.title,
      subtitle: album.subtitle,
      imageUrl: album.imageUrl,
      previewUrl:
        album.previewUrl,
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

function rankAndDeduplicateArtists(
  artists: RankedArtist[],
  query: string,
  canonicalArtistIds: string[] = []
): ArtistSearchResult[] {
  const canonicalArtistPositions =
    new Map<string, number>();

  canonicalArtistIds.forEach(
    (artistId, index) => {
      canonicalArtistPositions.set(
        artistId,
        index + 1
      );
    }
  );

  const rankedArtists =
    artists
      .map((artist) => {
        const appleArtistId =
          artist.id.replace(
            /^apple-music-artist-/,
            ""
          );

        const canonicalPosition =
          canonicalArtistPositions.get(
            appleArtistId
          );

        const canonicalResultBoost =
          canonicalPosition === undefined
            ? 0
            : Math.max(
                1400,
                3200 -
                  (
                    canonicalPosition -
                    1
                  ) *
                    300
              );

        return {
          ...artist,
          score:
            getResourceScore(
              artist.title,
              artist.subtitle ?? "",
              query,
              artist.originalIndex
            ) +
            canonicalResultBoost,
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

  const seenNames =
    new Set<string>();

  const results:
    ArtistSearchResult[] = [];

  for (
    const artist of rankedArtists
  ) {
    const key =
      normalizeText(
        artist.title
      );

    if (seenNames.has(key)) {
      continue;
    }

    seenNames.add(key);

    results.push({
      id: artist.id,
      title: artist.title,
      subtitle: artist.subtitle,
      imageUrl: artist.imageUrl,
      previewUrl:
        artist.previewUrl,
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


function getPopularResultLimit(
  value: unknown
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 20;
  }

  return Math.min(
    MAX_POPULAR_RESULT_LIMIT,
    Math.max(
      1,
      Math.floor(value)
    )
  );
}

async function getPopularAppleMusicSongs(
  topic: string | undefined,
  limit: number
): Promise<SongSearchResult[]> {
  const developerToken =
    await getDeveloperToken();

  await getSongChartIds(
    developerToken,
    topic
  );

  const normalizedTopic =
    normalizeText(topic ?? "") ||
    "general";

  const cacheKey = [
    DEFAULT_STOREFRONT,
    normalizedTopic,
  ].join("|");

  const chartSongs =
    cachedSongCharts.get(
      cacheKey
    )?.songs ?? [];

  const currentYear =
    new Date().getUTCFullYear();

  const mappedSongs =
    chartSongs
      .map(
        (
          song,
          originalIndex
        ) => {
          const mappedSong =
            mapSong(
              song,
              originalIndex
            );

          if (!mappedSong) {
            return null;
          }

          const releaseYear =
            Number.parseInt(
              mappedSong.releaseDate
                .slice(0, 4),
              10
            );

          const ageInYears =
            Number.isFinite(
              releaseYear
            )
              ? Math.max(
                  0,
                  currentYear -
                    releaseYear
                )
              : 0;

          /*
           * Empty-state Song suggestions should
           * balance current popularity with
           * catalogue longevity.
           *
           * Chart position still matters, while
           * songs that have remained relevant for
           * many years receive an additional boost.
           *
           * The longevity bonus is capped so major
           * contemporary songs can still surface.
           */
          const chartStrength =
            Math.max(
              0,
              250 -
                originalIndex
            );

          const longevityStrength =
            Math.min(
              ageInYears,
              50
            ) * 8;

          return {
            song: mappedSong,
            suggestionScore:
              chartStrength +
              longevityStrength,
          };
        }
      )
      .filter(
        (
          entry
        ): entry is {
          song: RankedSong;
          suggestionScore: number;
        } =>
          entry !== null
      )
      .sort(
        (first, second) =>
          second.suggestionScore -
            first.suggestionScore ||
          first.song.originalIndex -
            second.song.originalIndex
      );

  const seenKeys =
    new Set<string>();

  const results:
    SongSearchResult[] = [];

  for (
    const entry of mappedSongs
  ) {
    const song =
      entry.song;

    const deduplicationKey =
      getDeduplicationKey(song);

    if (
      seenKeys.has(
        deduplicationKey
      )
    ) {
      continue;
    }

    seenKeys.add(
      deduplicationKey
    );

    results.push({
      id: song.id,
      title: song.title,
      subtitle: song.subtitle,
      imageUrl: song.imageUrl,
      previewUrl: song.previewUrl,
    });

    if (
      results.length >= limit
    ) {
      break;
    }
  }

  return results;
}


async function fetchAlbumsWithTracks(
  developerToken: string,
  albumIds: string[]
): Promise<Map<string, AppleMusicAlbum>> {
  const uniqueAlbumIds =
    Array.from(
      new Set(
        albumIds
          .map((id) => id.trim())
          .filter(Boolean)
      )
    );

  if (
    uniqueAlbumIds.length === 0
  ) {
    return new Map();
  }

  const url =
    new URL(
      `${APPLE_MUSIC_API_BASE_URL}/catalog/${DEFAULT_STOREFRONT}/albums`
    );

  url.searchParams.set(
    "ids",
    uniqueAlbumIds.join(",")
  );

  url.searchParams.set(
    "include",
    "tracks"
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
      `Apple Music album-track lookup failed with status ${response.status}.`
    );
  }

  const data =
    await response.json() as {
      data?: AppleMusicAlbum[];
    };

  return new Map(
    (
      data.data ?? []
    )
      .map(
        (album) => [
          album.id?.trim() ?? "",
          album,
        ] as const
      )
      .filter(
        ([id]) =>
          Boolean(id)
      )
  );
}

async function getPopularAppleMusicAlbums(
  topic: string | undefined,
  limit: number
): Promise<AlbumSearchResult[]> {
  const developerToken =
    await getDeveloperToken();

  await getAlbumChartIds(
    developerToken,
    topic
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
      "Apple Music song chart lookup failed; album previews will fall back to the first available track preview:",
      error
    );
  }

  const normalizedTopic =
    normalizeText(topic ?? "") ||
    "general";

  const cacheKey = [
    DEFAULT_STOREFRONT,
    normalizedTopic,
  ].join("|");

  const chartAlbums =
    cachedAlbumCharts.get(
      cacheKey
    )?.albums ?? [];

  let albumsWithTracks =
    new Map<
      string,
      AppleMusicAlbum
    >();

  try {
    albumsWithTracks =
      await fetchAlbumsWithTracks(
        developerToken,
        chartAlbums
          .map(
            (album) =>
              album.id?.trim() ?? ""
          )
          .filter(Boolean)
          .slice(
            0,
            MAX_POPULAR_RESULT_LIMIT
          )
      );
  } catch (error) {
    console.warn(
      "Apple Music album-track lookup failed; popular album previews may be unavailable:",
      error
    );
  }

  const currentYear =
    new Date().getUTCFullYear();

  const mappedAlbums =
    chartAlbums
      .map(
        (
          album,
          originalIndex
        ) => {
          const albumWithTracks =
            albumsWithTracks.get(
              album.id?.trim() ?? ""
            ) ?? album;

          const mappedAlbum =
            mapAlbum(
              albumWithTracks,
              originalIndex,
              chartSongIds
            );

          if (!mappedAlbum) {
            return null;
          }

          const releaseYear =
            Number.parseInt(
              mappedAlbum.releaseDate
                .slice(0, 4),
              10
            );

          const ageInYears =
            Number.isFinite(
              releaseYear
            )
              ? Math.max(
                  0,
                  currentYear -
                    releaseYear
                )
              : 0;

          /*
           * Empty-state Album suggestions should
           * feel more evergreen than a live chart.
           *
           * The chart position still matters, but
           * an album also earns a longevity bonus
           * for remaining culturally relevant years
           * after its original release.
           *
           * The bonus is capped so older catalogue
           * albums do not completely overwhelm major
           * contemporary releases.
           */
          const chartStrength =
            Math.max(
              0,
              250 -
                originalIndex
            );

          const longevityStrength =
            Math.min(
              ageInYears,
              50
            ) * 8;

          return {
            album: mappedAlbum,
            suggestionScore:
              chartStrength +
              longevityStrength,
          };
        }
      )
      .filter(
        (
          entry
        ): entry is {
          album: RankedAlbum;
          suggestionScore: number;
        } =>
          entry !== null
      )
      .sort(
        (first, second) =>
          second.suggestionScore -
            first.suggestionScore ||
          first.album.originalIndex -
            second.album.originalIndex
      );

  const seenKeys =
    new Set<string>();

  const results:
    AlbumSearchResult[] = [];

  for (
    const entry of mappedAlbums
  ) {
    const album =
      entry.album;

    const key = [
      normalizeText(album.title),
      normalizeText(
        album.artistName
      ),
    ].join("|");

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);

    results.push({
      id: album.id,
      title: album.title,
      subtitle: album.subtitle,
      imageUrl: album.imageUrl,
      previewUrl:
        album.previewUrl,
    });

    if (
      results.length >= limit
    ) {
      break;
    }
  }

  return results;
}

async function getPopularAppleMusicArtists(
  topic: string | undefined,
  limit: number
): Promise<ArtistSearchResult[]> {
  const developerToken =
    await getDeveloperToken();

  await getAlbumChartIds(
    developerToken,
    topic
  );

  const normalizedTopic =
    normalizeText(topic ?? "") ||
    "general";

  const cacheKey = [
    DEFAULT_STOREFRONT,
    normalizedTopic,
  ].join("|");

  const chartAlbums =
    cachedAlbumCharts.get(
      cacheKey
    )?.albums ?? [];

  const currentYear =
    new Date().getUTCFullYear();

  const artistCandidates =
    new Map<
      string,
      {
        artistName: string;
        imageUrl?: string;
        bestChartPosition: number;
        oldestReleaseYear?: number;
        chartAppearances: number;
      }
    >();

  chartAlbums.forEach(
    (
      album,
      originalIndex
    ) => {
      const artistName =
        album.attributes
          ?.artistName
          ?.trim();

      if (!artistName) {
        return;
      }

      const normalizedArtistName =
        normalizeText(
          artistName
        );

      if (!normalizedArtistName) {
        return;
      }

      const releaseDate =
        album.attributes
          ?.releaseDate
          ?.trim() ?? "";

      const releaseYear =
        Number.parseInt(
          releaseDate.slice(0, 4),
          10
        );

      const existing =
        artistCandidates.get(
          normalizedArtistName
        );

      if (!existing) {
        artistCandidates.set(
          normalizedArtistName,
          {
            artistName,
            imageUrl:
              getArtworkUrl(
                album.attributes
                  ?.artwork
              ),
            bestChartPosition:
              originalIndex,
            oldestReleaseYear:
              Number.isFinite(
                releaseYear
              )
                ? releaseYear
                : undefined,
            chartAppearances: 1,
          }
        );

        return;
      }

      existing.bestChartPosition =
        Math.min(
          existing.bestChartPosition,
          originalIndex
        );

      existing.chartAppearances += 1;

      if (
        Number.isFinite(
          releaseYear
        ) &&
        (
          existing.oldestReleaseYear ===
            undefined ||
          releaseYear <
            existing.oldestReleaseYear
        )
      ) {
        existing.oldestReleaseYear =
          releaseYear;
      }

      if (!existing.imageUrl) {
        existing.imageUrl =
          getArtworkUrl(
            album.attributes
              ?.artwork
          );
      }
    }
  );

  /*
   * Artist suggestions use the same evergreen
   * principle as Albums:
   *
   * - strong current chart presence still matters
   * - artists with catalogue longevity receive a
   *   meaningful boost
   * - multiple charting albums add another signal
   *   of sustained relevance
   *
   * This keeps Suggestions broader than a simple
   * "popular right now" list without changing
   * typed Artist search.
   */
  const rankedArtists =
    Array.from(
      artistCandidates.entries()
    )
      .map(
        ([
          normalizedArtistName,
          candidate,
        ]) => {
          const ageInYears =
            candidate
              .oldestReleaseYear ===
            undefined
              ? 0
              : Math.max(
                  0,
                  currentYear -
                    candidate
                      .oldestReleaseYear
                );

          const chartStrength =
            Math.max(
              0,
              250 -
                candidate
                  .bestChartPosition
            );

          const longevityStrength =
            Math.min(
              ageInYears,
              50
            ) * 8;

          const catalogueStrength =
            Math.min(
              candidate
                .chartAppearances,
              5
            ) * 40;

          return {
            normalizedArtistName,
            ...candidate,
            suggestionScore:
              chartStrength +
              longevityStrength +
              catalogueStrength,
          };
        }
      )
      .sort(
        (first, second) =>
          second.suggestionScore -
            first.suggestionScore ||
          first.bestChartPosition -
            second.bestChartPosition
      );

  return rankedArtists
    .slice(0, limit)
    .map(
      (artist) => ({
        id:
          `apple-music-artist-suggestion-${artist.normalizedArtistName.replace(/\s+/g, "-")}`,
        title:
          artist.artistName,
        imageUrl:
          artist.imageUrl,
      })
    );
}

function buildSearchUrl(
  query: string,
  resource: AppleMusicResource
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
    resource
  );

  url.searchParams.set(
    "limit",
    String(APPLE_SEARCH_LIMIT)
  );

  if (resource === "albums") {
    url.searchParams.set(
      "include",
      "tracks"
    );
  }

  return url.toString();
}


async function fetchAppleMusicSearch(
  query: string,
  resource: AppleMusicResource
): Promise<AppleMusicSearchResponse> {
  const developerToken =
    await getDeveloperToken();

  const response =
    await fetch(
      buildSearchUrl(
        query,
        resource
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

  return data ?? {};
}

async function searchAppleMusicAlbums(
  query: string,
  topic?: string
): Promise<AlbumSearchResult[]> {
  const developerToken =
    await getDeveloperToken();

  const data =
    await fetchAppleMusicSearch(
      query,
      "albums"
    );

  const searchAlbums =
    data.results
      ?.albums
      ?.data ?? [];

  let topResultAlbumIds: string[] = [];

  try {
    topResultAlbumIds =
      await getAlbumTopResultIds(
        developerToken,
        query
      );
  } catch (error) {
    console.warn(
      "Apple Music album top-results lookup failed; continuing without canonical-result enrichment:",
      error
    );
  }

  let canonicalAlbumsWithTracks =
    new Map<
      string,
      AppleMusicAlbum
    >();

  try {
    canonicalAlbumsWithTracks =
      await fetchAlbumsWithTracks(
        developerToken,
        topResultAlbumIds
      );
  } catch (error) {
    console.warn(
      "Apple Music canonical album lookup failed; continuing with standard search results:",
      error
    );
  }

  const albumsById =
    new Map<
      string,
      AppleMusicAlbum
    >();

  for (const album of searchAlbums) {
    const albumId =
      album.id?.trim();

    if (albumId) {
      albumsById.set(
        albumId,
        album
      );
    }
  }

  for (
    const albumId of topResultAlbumIds
  ) {
    const canonicalAlbum =
      canonicalAlbumsWithTracks.get(
        albumId
      );

    if (canonicalAlbum) {
      albumsById.set(
        albumId,
        canonicalAlbum
      );
    }
  }

  const albums =
    Array.from(
      albumsById.values()
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
      "Apple Music song chart lookup failed; album previews will fall back to the first available track preview:",
      error
    );
  }

  let albumsWithTracks =
    new Map<
      string,
      AppleMusicAlbum
    >();

  try {
    albumsWithTracks =
      await fetchAlbumsWithTracks(
        developerToken,
        albums
          .map(
            (album) =>
              album.id?.trim() ?? ""
          )
          .filter(Boolean)
      );
  } catch (error) {
    console.warn(
      "Apple Music album-track lookup failed; search result previews may be unavailable:",
      error
    );
  }

  const mappedAlbums =
    albums
      .map(
        (
          album,
          originalIndex
        ) => {
          const albumWithTracks =
            albumsWithTracks.get(
              album.id?.trim() ?? ""
            ) ?? album;

          return mapAlbum(
            albumWithTracks,
            originalIndex,
            chartSongIds
          );
        }
      )
      .filter(
        (
          album
        ): album is RankedAlbum =>
          album !== null
      );

  const topicFilteredAlbums =
    mappedAlbums.filter((album) =>
      albumMatchesTopic(
        album,
        topic
      )
    );

  let chartAlbumIds: string[] = [];

  try {
    chartAlbumIds =
      await getAlbumChartIds(
        developerToken,
        topic
      );
  } catch (error) {
    console.warn(
      "Apple Music album chart lookup failed; continuing without popularity boost:",
      error
    );
  }

  return rankAndDeduplicateAlbums(
    topicFilteredAlbums,
    query,
    chartAlbumIds,
    topResultAlbumIds
  );
}

function getChartArtistPreviewUrl(
  artistName: string,
  chartSongs: AppleMusicSong[]
): string | undefined {
  const normalizedArtistName =
    normalizeText(
      artistName
    );

  if (!normalizedArtistName) {
    return undefined;
  }

  for (
    const song of chartSongs
  ) {
    const songArtistName =
      song.attributes
        ?.artistName
        ?.trim() ?? "";

    if (
      normalizeText(
        songArtistName
      ) !== normalizedArtistName
    ) {
      continue;
    }

    const previewUrl =
      song.attributes
        ?.previews
        ?.[0]
        ?.url
        ?.trim();

    if (previewUrl) {
      return previewUrl;
    }
  }

  return undefined;
}

async function getFallbackArtistPreviewUrl(
  artistName: string
): Promise<string | undefined> {
  const data =
    await fetchAppleMusicSearch(
      artistName,
      "songs"
    );

  const normalizedArtistName =
    normalizeText(
      artistName
    );

  const songs =
    data.results
      ?.songs
      ?.data ?? [];

  for (
    const song of songs
  ) {
    const songArtistName =
      song.attributes
        ?.artistName
        ?.trim() ?? "";

    if (
      normalizeText(
        songArtistName
      ) !== normalizedArtistName
    ) {
      continue;
    }

    const previewUrl =
      song.attributes
        ?.previews
        ?.[0]
        ?.url
        ?.trim();

    if (previewUrl) {
      return previewUrl;
    }
  }

  return undefined;
}

async function searchAppleMusicArtists(
  query: string,
  topic?: string
): Promise<ArtistSearchResult[]> {
  const developerToken =
    await getDeveloperToken();

  const data =
    await fetchAppleMusicSearch(
      query,
      "artists"
    );

  const artists =
    data.results
      ?.artists
      ?.data ?? [];

  let canonicalArtists:
    AppleMusicArtist[] = [];

  try {
    canonicalArtists =
      await getArtistTopResults(
        developerToken,
        query
      );
  } catch (error) {
    console.warn(
      "Apple Music artist top-results lookup failed; continuing without canonical-result enrichment:",
      error
    );
  }

  const mergedArtists =
    [
      ...canonicalArtists,
      ...artists,
    ].filter(
      (
        artist,
        index,
        allArtists
      ) => {
        const artistId =
          artist.id?.trim();

        if (!artistId) {
          return true;
        }

        return (
          allArtists.findIndex(
            (candidate) =>
              candidate.id?.trim() ===
              artistId
          ) === index
        );
      }
    );

  let chartSongs:
    AppleMusicSong[] = [];

  try {
    await getSongChartIds(
      developerToken,
      topic
    );

    const normalizedTopic =
      normalizeText(topic ?? "") ||
      "general";

    const cacheKey = [
      DEFAULT_STOREFRONT,
      normalizedTopic,
    ].join("|");

    chartSongs =
      cachedSongCharts.get(
        cacheKey
      )?.songs ?? [];
  } catch (error) {
    console.warn(
      "Apple Music song chart lookup failed; Artist previews will use search fallback:",
      error
    );
  }

  const mappedArtists =
    mergedArtists
      .map(
        (
          artist,
          originalIndex
        ) => {
          const artistName =
            artist.attributes
              ?.name
              ?.trim() ?? "";

          const chartPreviewUrl =
            getChartArtistPreviewUrl(
              artistName,
              chartSongs
            );

          return mapArtist(
            artist,
            originalIndex,
            chartPreviewUrl
          );
        }
      )
      .filter(
        (
          artist
        ): artist is RankedArtist =>
          artist !== null
      );

  const topicFilteredArtists =
    mappedArtists.filter((artist) =>
      artistMatchesTopic(
        artist,
        topic
      )
    );

  const rankedArtists =
    rankAndDeduplicateArtists(
      topicFilteredArtists,
      query,
      canonicalArtists
        .map((artist) =>
          artist.id?.trim()
        )
        .filter(
          (artistId): artistId is string =>
            Boolean(artistId)
        )
    );

  /*
   * Prefer the highest-ranked song from the
   * relevant Apple Music chart. If an artist
   * has no charted preview, fall back to the
   * first exact-artist song search result that
   * contains a preview.
   */
  return Promise.all(
    rankedArtists.map(
      async (artist) => {
        if (artist.previewUrl) {
          return artist;
        }

        try {
          const previewUrl =
            await getFallbackArtistPreviewUrl(
              artist.title
            );

          return {
            ...artist,
            previewUrl,
          };
        } catch (error) {
          console.warn(
            `Apple Music Artist preview lookup failed for ${artist.title}:`,
            error
          );

          return artist;
        }
      }
    )
  );
}

async function searchAppleMusicSongs(
  query: string,
  topic?: string
): Promise<SongSearchResult[]> {
  const developerToken =
    await getDeveloperToken();

  const response =
    await fetch(
      buildSearchUrl(query, "songs"),
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

      const mode =
        typeof body.mode === "string"
          ? body.mode.trim().toLowerCase()
          : "search";

      const topic =
        typeof body.topic === "string"
          ? body.topic.trim()
          : undefined;

      const requestedResource =
        typeof body.resource === "string"
          ? body.resource.trim().toLowerCase()
          : "songs";

      const resource:
        AppleMusicResource | null =
        requestedResource === "albums" ||
        requestedResource === "artists" ||
        requestedResource === "songs"
          ? requestedResource
          : null;

      if (!resource) {
        return jsonResponse(
          {
            error:
              "Unsupported Apple Music resource.",
          },
          400
        );
      }

      if (mode === "popular") {
        try {
          const limit =
            getPopularResultLimit(
              body.limit
            );

          const results =
            resource === "albums"
              ? await getPopularAppleMusicAlbums(
                  topic,
                  limit
                )
              : resource === "artists"
                ? await getPopularAppleMusicArtists(
                    topic,
                    limit
                  )
                : await getPopularAppleMusicSongs(
                    topic,
                    limit
                  );

          return jsonResponse({
            results,
          });
        } catch (error) {
          console.warn(
            "Apple Music popular suggestions failed; returning an empty result set:",
            error
          );

          return jsonResponse({
            results: [],
          });
        }
      }

      if (
        mode !== "search"
      ) {
        return jsonResponse(
          {
            error:
              "Unsupported Apple Music request mode.",
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
              "A music search query is required.",
          },
          400
        );
      }

      const query =
        body.query.trim();

      if (!query) {
        return jsonResponse(
          {
            error:
              "A music search query is required.",
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
          resource === "albums"
            ? await searchAppleMusicAlbums(
                query,
                topic
              )
            : resource === "artists"
              ? await searchAppleMusicArtists(
                  query,
                  topic
                )
              : await searchAppleMusicSongs(
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