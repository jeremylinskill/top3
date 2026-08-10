// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  importPKCS8,
  SignJWT,
} from "npm:jose@6.2.3";

type SearchRequestBody = {
  query?: unknown;
};

type AppleMusicArtwork = {
  url?: string;
  width?: number;
  height?: number;
};

type AppleMusicSongAttributes = {
  name?: string;
  artistName?: string;
  albumName?: string;
  releaseDate?: string;
  artwork?: AppleMusicArtwork;
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

type SongSearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
};

type RankedSong = SongSearchResult & {
  artistName: string;
  albumName: string;
  releaseDate: string;
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

  return {
    id: `apple-music-song-${id}`,
    title,
    subtitle:
      artistName || undefined,
    imageUrl: getArtworkUrl(
      song.attributes?.artwork
    ),
    artistName,
    albumName,
    releaseDate,
    originalIndex,
    score: 0,
  };
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
  query: string
): SongSearchResult[] {
  const rankedSongs =
    songs
      .map((song) => ({
        ...song,
        score: getSongScore(
          song,
          query
        ),
      }))
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
  query: string
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

  return rankAndDeduplicateSongs(
    mappedSongs,
    query
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
            query
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