import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

import { getSearchAlias } from './search-aliases.ts';

type TwitchTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

type IgdbCover = {
  image_id?: string;
};

type IgdbGame = {
  id?: number;
  name?: string;
  first_release_date?: number;
  total_rating?: number;
  total_rating_count?: number;
  cover?: IgdbCover;
};

type SearchRequestBody = {
  mode?: unknown;
  query?: unknown;
  topic?: unknown;
  limit?: unknown;
};

type GameSearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  rating?: number;
};

const TWITCH_TOKEN_URL =
  'https://id.twitch.tv/oauth2/token';

const IGDB_GAMES_URL =
  'https://api.igdb.com/v4/games';

const TOKEN_EXPIRY_BUFFER_MS = 60_000;
const MAX_QUERY_LENGTH = 100;

const DEFAULT_POPULAR_LIMIT = 20;
const MAX_POPULAR_LIMIT = 50;
const POPULAR_POOL_SIZE = 100;
const MIN_POPULAR_RATING_COUNT = 50;

const IGDB_GENRES: Record<
  string,
  number[]
> = {
  action: [4, 5, 8, 25, 33],
  adventure: [31],
  rpg: [12],
  shooter: [5],
  strategy: [15],
  simulation: [13],
  racing: [10],
  sports: [14],
  puzzle: [9],
};

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

function jsonResponse(
  body: unknown,
  status = 200
): Response {
  return Response.json(body, {
    status,
  });
}

function escapeIgdbSearchValue(
  value: string
): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function normalizeTitle(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type MatchType =
  | 'exact'
  | 'close'
  | 'franchise'
  | 'other';

function getMatchType(
  title: string,
  query: string
): MatchType {
  const normalizedTitle =
    normalizeTitle(title);

  const normalizedQuery =
    normalizeTitle(query);

  if (
    !normalizedTitle ||
    !normalizedQuery
  ) {
    return 'other';
  }

  if (
    normalizedTitle ===
    normalizedQuery
  ) {
    return 'exact';
  }

  if (
    normalizedTitle.startsWith(
      `${normalizedQuery} `
    )
  ) {
    return 'close';
  }

  const queryWords =
    normalizedQuery.split(' ');

  const titleWords =
    normalizedTitle.split(' ');

  if (
    queryWords.length > 1 &&
    queryWords.every(
      (word) =>
        titleWords.includes(word)
    )
  ) {
    return 'franchise';
  }

  return 'other';
}

function deduplicateGames(
  games: IgdbGame[]
): IgdbGame[] {
  const seenGames =
    new Set<string>();

  return games.filter((game) => {
    const normalizedTitle =
      normalizeTitle(
        game.name ?? ''
      );

    if (!normalizedTitle) {
      return false;
    }

    const releaseYear =
      getReleaseYear(
        game.first_release_date
      ) ?? 'unknown';

    const dedupeKey =
      `${normalizedTitle}:${releaseYear}`;

    if (
      seenGames.has(
        dedupeKey
      )
    ) {
      return false;
    }

    seenGames.add(
      dedupeKey
    );

    return true;
  });
}

function getSearchScore(
  game: IgdbGame,
  query: string
): number {
  const normalizedQuery =
    normalizeTitle(query);

  const normalizedTitle =
    normalizeTitle(game.name ?? '');

  let score = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 10_000;
  } else if (
    normalizedTitle.startsWith(
      normalizedQuery
    )
  ) {
    score += 5_000;
  } else if (
    normalizedTitle.includes(
      normalizedQuery
    )
  ) {
    score += 2_500;
  }

  if (
    typeof game.total_rating === 'number' &&
    Number.isFinite(game.total_rating)
  ) {
    score += game.total_rating;
  }

  if (
    typeof game.total_rating_count === 'number' &&
    Number.isFinite(game.total_rating_count) &&
    game.total_rating_count > 0
  ) {
    score +=
      Math.log10(
        game.total_rating_count + 1
      ) * 25;
  }

  return score;
}


function deduplicateGamesByBestMatch(
  games: IgdbGame[],
  query: string
): IgdbGame[] {
  const bestGames =
    new Map<string, IgdbGame>();

  for (const game of games) {
    const normalizedTitle =
      normalizeTitle(
        game.name ?? ''
      );

    if (!normalizedTitle) {
      continue;
    }

    const existingGame =
      bestGames.get(
        normalizedTitle
      );

    if (!existingGame) {
      bestGames.set(
        normalizedTitle,
        game
      );

      continue;
    }

    const existingScore =
      getSearchScore(
        existingGame,
        query
      );

    const nextScore =
      getSearchScore(
        game,
        query
      );

    if (
      nextScore >
      existingScore
    ) {
      bestGames.set(
        normalizedTitle,
        game
      );
    }
  }

  return Array.from(
    bestGames.values()
  );
}

function getReleaseYear(
  firstReleaseDate?: number
): string | undefined {
  if (
    typeof firstReleaseDate !== 'number' ||
    !Number.isFinite(firstReleaseDate)
  ) {
    return undefined;
  }

  return new Date(firstReleaseDate * 1000)
    .getUTCFullYear()
    .toString();
}

function getCoverUrl(
  imageId?: string
): string | undefined {
  if (!imageId) {
    return undefined;
  }

  return (
    'https://images.igdb.com/igdb/image/upload/' +
    `t_cover_big/${imageId}.jpg`
  );
}

function getFiveStarRating(
  totalRating?: number
): number | undefined {
  if (
    typeof totalRating !== 'number' ||
    !Number.isFinite(totalRating)
  ) {
    return undefined;
  }

  const normalizedRating =
    totalRating / 20;

  return (
    Math.round(normalizedRating * 10) /
    10
  );
}

async function getTwitchAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const now = Date.now();

  if (
    cachedAccessToken &&
    now < cachedAccessTokenExpiresAt
  ) {
    return cachedAccessToken;
  }

  const tokenUrl =
    new URL(TWITCH_TOKEN_URL);

  tokenUrl.searchParams.set(
    'client_id',
    clientId
  );

  tokenUrl.searchParams.set(
    'client_secret',
    clientSecret
  );

  tokenUrl.searchParams.set(
    'grant_type',
    'client_credentials'
  );

  const response = await fetch(
    tokenUrl,
    {
      method: 'POST',
    }
  );

  if (!response.ok) {
    const responseText =
      await response.text();

    console.error(
      'Twitch token request failed:',
      response.status,
      responseText
    );

    throw new Error(
      'Unable to authenticate with Twitch.'
    );
  }

  const data =
    (await response.json()) as TwitchTokenResponse;

  if (
    typeof data.access_token !== 'string' ||
    typeof data.expires_in !== 'number'
  ) {
    console.error(
      'Invalid Twitch token response:',
      data
    );

    throw new Error(
      'Twitch returned an invalid token response.'
    );
  }

  cachedAccessToken =
    data.access_token;

  cachedAccessTokenExpiresAt =
    now +
    data.expires_in * 1000 -
    TOKEN_EXPIRY_BUFFER_MS;

  return data.access_token;
}

function normalizeTopic(
  topic?: string
): string {
  return (
    topic
      ?.trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      ) ?? ''
  );
}

function getTopicGenreIds(
  topic?: string
): number[] | undefined {
  const normalizedTopic =
    normalizeTopic(topic);

  if (
    !normalizedTopic ||
    normalizedTopic === 'general'
  ) {
    return undefined;
  }

  if (
    normalizedTopic ===
    'role-playing-game'
  ) {
    return IGDB_GENRES.rpg;
  }

  return IGDB_GENRES[
    normalizedTopic
  ];
}

function getPopularScore(
  game: IgdbGame
): number {
  const rating =
    typeof game.total_rating === 'number' &&
    Number.isFinite(
      game.total_rating
    )
      ? game.total_rating
      : 0;

  const ratingCount =
    typeof game.total_rating_count === 'number' &&
    Number.isFinite(
      game.total_rating_count
    )
      ? game.total_rating_count
      : 0;

  const ratingScore =
    rating * 10;

  const ratingCountScore =
    Math.log10(
      ratingCount + 1
    ) * 250;

  return (
    ratingScore +
    ratingCountScore
  );
}

function mapIgdbGameToSearchResult(
  game: IgdbGame & {
    id: number;
    name: string;
  }
): GameSearchResult {
  return {
    id: `game-${game.id}`,
    title: game.name,
    subtitle: getReleaseYear(
      game.first_release_date
    ),
    imageUrl: getCoverUrl(
      game.cover?.image_id
    ),
    rating: getFiveStarRating(
      game.total_rating
    ),
  };
}

function buildFieldsClause(): string {
  return [
    'fields',
    'id,',
    'name,',
    'first_release_date,',
    'total_rating,',
    'total_rating_count,',
    'cover.image_id;',
  ].join(' ');
}

function buildGameTypeFilter(): string {
  return (
    'version_parent = null & ' +
    'parent_game = null & ' +
    'game_type = (0,8,9,10,11)'
  );
}

async function fetchIgdbGames(
  requestBody: string,
  clientId: string,
  accessToken: string
): Promise<IgdbGame[]> {
  const response = await fetch(
    IGDB_GAMES_URL,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Client-ID': clientId,
        Authorization:
          `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      body: requestBody,
    }
  );

  if (!response.ok) {
    const responseText =
      await response.text();

    console.error(
      'IGDB search request failed:',
      response.status,
      responseText
    );

    throw new Error(
      `IGDB search failed with status ${response.status}.`
    );
  }

  const data =
    await response.json();

  if (!Array.isArray(data)) {
    console.error(
      'Invalid IGDB search response:',
      data
    );

    throw new Error(
      'IGDB returned an invalid search response.'
    );
  }

  return data as IgdbGame[];
}

async function searchIgdbGames(
  query: string,
  clientId: string,
  accessToken: string
): Promise<GameSearchResult[]> {
  const searchQuery =
    getSearchAlias(query) ?? query;

  const escapedQuery =
    escapeIgdbSearchValue(
      searchQuery
    );

  const standardSearchBody = [
    `search "${escapedQuery}";`,
    buildFieldsClause(),
    `where ${buildGameTypeFilter()};`,
    'limit 20;',
  ].join('\n');

  const prefixSearchBody = [
    buildFieldsClause(),
    [
      'where',
      `name ~ "${escapedQuery}"*`,
      `& ${buildGameTypeFilter()};`,
    ].join(' '),
    'limit 20;',
  ].join('\n');

  const [
    standardGames,
    prefixGames,
  ] = await Promise.all([
    fetchIgdbGames(
      standardSearchBody,
      clientId,
      accessToken
    ),
    fetchIgdbGames(
      prefixSearchBody,
      clientId,
      accessToken
    ),
  ]);

  const gamesById =
    new Map<number, IgdbGame>();

  for (const game of [
    ...standardGames,
    ...prefixGames,
  ]) {
    if (typeof game.id !== 'number') {
      continue;
    }

    if (!gamesById.has(game.id)) {
      gamesById.set(
        game.id,
        game
      );
    }
  }

  const games =
    Array.from(gamesById.values());

  const rankedGames = games
    .filter(
      (
        game
      ): game is IgdbGame & {
        id: number;
        name: string;
      } =>
        typeof game.id === 'number' &&
        typeof game.name === 'string' &&
        game.name.trim().length > 0
    )
    .sort(
      (
        firstGame,
        secondGame
      ) => {
        const firstMatchType =
          getMatchType(
            firstGame.name,
            searchQuery
          );

        const secondMatchType =
          getMatchType(
            secondGame.name,
            searchQuery
          );

        const matchPriority:
          Record<MatchType, number> = {
            exact: 4,
            close: 3,
            franchise: 2,
            other: 1,
          };

        const priorityDifference =
          matchPriority[
            secondMatchType
          ] -
          matchPriority[
            firstMatchType
          ];

        if (
          priorityDifference !== 0
        ) {
          return priorityDifference;
        }

        return (
          getSearchScore(
            secondGame,
            searchQuery
          ) -
          getSearchScore(
            firstGame,
            searchQuery
          )
        );
      }
    );

  return deduplicateGamesByBestMatch(
  rankedGames,
  searchQuery
)
    .slice(0, 10)
    .map((game) => ({
      id: `game-${game.id}`,
      title: game.name ?? 'Untitled',
      subtitle: getReleaseYear(
        game.first_release_date
      ),
      imageUrl: getCoverUrl(
        game.cover?.image_id
      ),
      rating: getFiveStarRating(
        game.total_rating
      ),
    }));
}

async function getPopularIgdbGames(
  topic: string | undefined,
  limit: number,
  clientId: string,
  accessToken: string
): Promise<GameSearchResult[]> {
  const genreIds =
    getTopicGenreIds(topic);

  const whereParts = [
    buildGameTypeFilter(),
    'total_rating != null',
    `total_rating_count >= ${MIN_POPULAR_RATING_COUNT}`,
    'cover != null',
  ];

  if (
    genreIds &&
    genreIds.length > 0
  ) {
    whereParts.push(
      `genres = (${genreIds.join(',')})`
    );
  }

  const requestBody = [
    buildFieldsClause(),
    `where ${whereParts.join(' & ')};`,
    'sort total_rating_count desc;',
    `limit ${POPULAR_POOL_SIZE};`,
  ].join('\n');

  const games =
    await fetchIgdbGames(
      requestBody,
      clientId,
      accessToken
    );

  return deduplicateGames(games)
    .filter(
      (
        game
      ): game is IgdbGame & {
        id: number;
        name: string;
      } =>
        typeof game.id === 'number' &&
        typeof game.name === 'string' &&
        game.name.trim().length > 0
    )
    .sort(
      (
        firstGame,
        secondGame
      ) =>
        getPopularScore(
          secondGame
        ) -
        getPopularScore(
          firstGame
        )
    )
    .slice(
      0,
      limit
    )
    .map(
      mapIgdbGameToSearchResult
    );
}

export default {
  fetch: withSupabase(
    {
      auth: 'user',
    },
    async (
      request: Request
    ) => {
      try {
        if (request.method !== 'POST') {
          return jsonResponse(
            {
              error:
                'Method not allowed.',
            },
            405
          );
        }

        const clientId =
          Deno.env.get(
            'TWITCH_CLIENT_ID'
          );

        const clientSecret =
          Deno.env.get(
            'TWITCH_CLIENT_SECRET'
          );

        if (
          !clientId ||
          !clientSecret
        ) {
          console.error(
            'Missing Twitch credentials.'
          );

          return jsonResponse(
            {
              error:
                'Video game search is not configured.',
            },
            500
          );
        }

        let body: SearchRequestBody;

        try {
          body =
            (await request.json()) as SearchRequestBody;
        } catch {
          return jsonResponse(
            {
              error:
                'Invalid request body.',
            },
            400
          );
        }

        const mode =
          typeof body.mode === 'string'
            ? body.mode
                .trim()
                .toLowerCase()
            : 'search';

        const accessToken =
          await getTwitchAccessToken(
            clientId,
            clientSecret
          );

        if (mode === 'popular') {
          const topic =
            typeof body.topic === 'string'
              ? body.topic
              : undefined;

          const requestedLimit =
            typeof body.limit === 'number' &&
            Number.isFinite(
              body.limit
            )
              ? Math.floor(
                  body.limit
                )
              : DEFAULT_POPULAR_LIMIT;

          const limit =
            Math.min(
              Math.max(
                requestedLimit,
                1
              ),
              MAX_POPULAR_LIMIT
            );

          const results =
            await getPopularIgdbGames(
              topic,
              limit,
              clientId,
              accessToken
            );

          return jsonResponse({
            results,
          });
        }

        if (mode !== 'search') {
          return jsonResponse(
            {
              error:
                'Unsupported IGDB request mode.',
            },
            400
          );
        }

        if (
          typeof body.query !==
          'string'
        ) {
          return jsonResponse(
            {
              error:
                'A search query is required.',
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
                'A search query is required.',
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

        const results =
          await searchIgdbGames(
            query,
            clientId,
            accessToken
          );

        return jsonResponse({
          results,
        });
      } catch (error) {
        console.error(
          'IGDB Edge Function failed:',
          error
        );

        return jsonResponse(
          {
            error:
              'Video game search is temporarily unavailable.',
          },
          500
        );
      }
    }
  ),
};