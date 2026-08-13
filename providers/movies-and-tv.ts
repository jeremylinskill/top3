import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { Top3Item } from '@/types/top3-item';

type TMDBMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
};

type TMDBTvShow = {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
};

type TMDBSearchResponse<T> = {
  results?: T[];
};

type TMDBVideo = {
  id?: string;
  key?: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
  published_at?: string;
};

type TMDBVideosResponse = {
  results?: TMDBVideo[];
};

type DiscoverSort =
  | 'popularity.desc'
  | 'vote_count.desc';

const API_BASE_URL =
  'https://api.themoviedb.org/3';

const IMAGE_BASE_URL =
  'https://image.tmdb.org/t/p/w500';

const MOVIE_MINIMUM_VOTE_COUNT = 500;
const TV_MINIMUM_VOTE_COUNT = 200;

const DISCOVER_PAGE_COUNT = 3;

const DISCOVER_SORTS: DiscoverSort[] = [
  'popularity.desc',
  'vote_count.desc',
];

const MAX_LONGEVITY_YEARS = 30;

const TRAILER_URL_CACHE =
  new Map<string, string | null>();

function getTrailerCacheKey(
  categoryId: 'movies' | 'tv',
  itemId: number
) {
  return `${categoryId}:${itemId}`;
}


export function getCachedTrailerAvailability(
  categoryId: 'movies' | 'tv',
  itemId: number
): boolean | undefined {
  const cacheKey =
    getTrailerCacheKey(
      categoryId,
      itemId
    );

  if (!TRAILER_URL_CACHE.has(cacheKey)) {
    return undefined;
  }

  return (
    TRAILER_URL_CACHE.get(cacheKey) !== null
  );
}

function getApiKey() {
  const apiKey =
    process.env.EXPO_PUBLIC_TMDB_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_TMDB_API_KEY in .env'
    );
  }

  return apiKey;
}

function getTopicGenreId(
  categoryId: 'movies' | 'tv',
  topic?: string
) {
  if (!topic) {
    return undefined;
  }

  const category = TOP3_CATEGORIES.find(
    (item) => item.id === categoryId
  );

  const selectedTopic =
    category?.topics.find(
      (item) =>
        item.name.toLowerCase() ===
        topic.toLowerCase()
    );

  return selectedTopic?.tmdbGenreId;
}

function movieToTop3Item(
  movie: TMDBMovie
): Top3Item {
  return {
    id: `movie-${movie.id}`,
    title: movie.title,
    subtitle:
      movie.release_date?.slice(0, 4),
    imageUrl: movie.poster_path
      ? `${IMAGE_BASE_URL}${movie.poster_path}`
      : undefined,
    rating: movie.vote_average,
  };
}

function tvShowToTop3Item(
  show: TMDBTvShow
): Top3Item {
  return {
    id: `tv-${show.id}`,
    title: show.name,
    subtitle:
      show.first_air_date?.slice(0, 4),
    imageUrl: show.poster_path
      ? `${IMAGE_BASE_URL}${show.poster_path}`
      : undefined,
    rating: show.vote_average,
  };
}

function buildDiscoverUrl(
  categoryId: 'movies' | 'tv',
  topic: string | undefined,
  page: number,
  sortBy: DiscoverSort
) {
  const apiKey = getApiKey();

  const endpoint =
    categoryId === 'movies'
      ? 'movie'
      : 'tv';

  const genreId =
    getTopicGenreId(
      categoryId,
      topic
    );

  const minimumVoteCount =
    categoryId === 'movies'
      ? MOVIE_MINIMUM_VOTE_COUNT
      : TV_MINIMUM_VOTE_COUNT;

  const params = new URLSearchParams({
    api_key: apiKey,
    include_adult: 'false',
    language: 'en-US',
    page: page.toString(),
    sort_by: sortBy,
    'vote_count.gte':
      minimumVoteCount.toString(),
  });

  if (categoryId === 'movies') {
    params.set(
      'include_video',
      'false'
    );
  }

  if (genreId) {
    params.set(
      'with_genres',
      genreId.toString()
    );
  }

  return (
    `${API_BASE_URL}/discover/${endpoint}` +
    `?${params.toString()}`
  );
}

async function fetchDiscoverPool<
  T extends { id: number }
>(
  categoryId: 'movies' | 'tv',
  topic?: string,
  signal?: AbortSignal
): Promise<T[]> {
  const requests =
    DISCOVER_SORTS.flatMap((sortBy) =>
      Array.from(
        { length: DISCOVER_PAGE_COUNT },
        (_, index) =>
          fetch(
            buildDiscoverUrl(
              categoryId,
              topic,
              index + 1,
              sortBy
            ),
            {
              signal,
            }
          )
      )
    );

  const responses =
    await Promise.all(requests);

  const responseData =
    await Promise.all(
      responses.map(async (response) => {
        if (!response.ok) {
          throw new Error(
            `TMDB discover request failed: ${response.status}`
          );
        }

        return (
          await response.json()
        ) as TMDBSearchResponse<T>;
      })
    );

  const uniqueResults =
    new Map<number, T>();

  responseData.forEach((data) => {
    (data.results ?? []).forEach(
      (item) => {
        if (!uniqueResults.has(item.id)) {
          uniqueResults.set(
            item.id,
            item
          );
        }
      }
    );
  });

  return Array.from(
    uniqueResults.values()
  );
}

function getReleaseYear(
  date?: string
) {
  if (!date) {
    return undefined;
  }

  const year = Number(
    date.slice(0, 4)
  );

  return Number.isFinite(year)
    ? year
    : undefined;
}

function getLongevityScore(
  releaseYear?: number
) {
  if (!releaseYear) {
    return 0;
  }

  const currentYear =
    new Date().getUTCFullYear();

  const ageInYears = Math.max(
    0,
    currentYear - releaseYear
  );

  return (
    Math.min(
      ageInYears,
      MAX_LONGEVITY_YEARS
    ) * 6
  );
}

function getHybridPopularityScore(
  voteAverage?: number,
  voteCount?: number,
  popularity?: number,
  releaseYear?: number
) {
  const safeVoteAverage =
    Number.isFinite(voteAverage)
      ? voteAverage ?? 0
      : 0;

  const safeVoteCount =
    Number.isFinite(voteCount)
      ? voteCount ?? 0
      : 0;

  const safePopularity =
    Number.isFinite(popularity)
      ? popularity ?? 0
      : 0;

  const ratingScore =
    safeVoteAverage * 80;

  const voteCountScore =
    Math.log10(
      safeVoteCount + 1
    ) * 200;

  const popularityScore =
    Math.log10(
      safePopularity + 1
    ) * 25;

  const longevityScore =
    getLongevityScore(
      releaseYear
    );

  return (
    ratingScore +
    voteCountScore +
    popularityScore +
    longevityScore
  );
}

function rankPopularMovies(
  movies: TMDBMovie[]
) {
  return [...movies].sort(
    (first, second) =>
      getHybridPopularityScore(
        second.vote_average,
        second.vote_count,
        second.popularity,
        getReleaseYear(
          second.release_date
        )
      ) -
      getHybridPopularityScore(
        first.vote_average,
        first.vote_count,
        first.popularity,
        getReleaseYear(
          first.release_date
        )
      )
  );
}

function rankPopularTvShows(
  shows: TMDBTvShow[]
) {
  return [...shows].sort(
    (first, second) =>
      getHybridPopularityScore(
        second.vote_average,
        second.vote_count,
        second.popularity,
        getReleaseYear(
          second.first_air_date
        )
      ) -
      getHybridPopularityScore(
        first.vote_average,
        first.vote_count,
        first.popularity,
        getReleaseYear(
          first.first_air_date
        )
      )
  );
}

function getTrailerPriority(
  video: TMDBVideo
) {
  const site =
    video.site?.trim().toLowerCase();

  const type =
    video.type?.trim().toLowerCase();

  if (site !== 'youtube') {
    return -1;
  }

  if (
    type === 'trailer' &&
    video.official
  ) {
    return 3;
  }

  if (type === 'trailer') {
    return 2;
  }

  if (type === 'teaser') {
    return 1;
  }

  return 0;
}

function getPublishedTimestamp(
  video: TMDBVideo
) {
  const timestamp =
    Date.parse(
      video.published_at ?? ''
    );

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

export async function getMovieTrailerUrl(
  movieId: number,
  signal?: AbortSignal
): Promise<string | undefined> {
  const cacheKey =
    getTrailerCacheKey('movies', movieId);

  if (TRAILER_URL_CACHE.has(cacheKey)) {
    return (
      TRAILER_URL_CACHE.get(cacheKey) ??
      undefined
    );
  }

  const apiKey = getApiKey();

  const response = await fetch(
    `${API_BASE_URL}/movie/${movieId}/videos` +
      `?api_key=${apiKey}` +
      `&language=en-US`,
    {
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(
      `TMDB movie videos request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as TMDBVideosResponse;

  const selectedVideo =
    [...(data.results ?? [])]
      .filter(
        (video) =>
          Boolean(
            video.key?.trim()
          ) &&
          getTrailerPriority(video) >= 0
      )
      .sort(
        (first, second) => {
          const priorityDifference =
            getTrailerPriority(second) -
            getTrailerPriority(first);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          return (
            getPublishedTimestamp(second) -
            getPublishedTimestamp(first)
          );
        }
      )[0];

  const videoKey =
    selectedVideo?.key?.trim();

  if (!videoKey) {
    TRAILER_URL_CACHE.set(
      cacheKey,
      null
    );

    return undefined;
  }

  const trailerUrl =
    'https://www.youtube.com/watch?v=' +
    encodeURIComponent(videoKey);

  TRAILER_URL_CACHE.set(
    cacheKey,
    trailerUrl
  );

  return trailerUrl;
}

export async function getTvShowTrailerUrl(
  showId: number,
  signal?: AbortSignal
): Promise<string | undefined> {
  const cacheKey =
    getTrailerCacheKey('tv', showId);

  if (TRAILER_URL_CACHE.has(cacheKey)) {
    return (
      TRAILER_URL_CACHE.get(cacheKey) ??
      undefined
    );
  }

  const apiKey = getApiKey();

  const response = await fetch(
    `${API_BASE_URL}/tv/${showId}/videos` +
      `?api_key=${apiKey}` +
      `&language=en-US`,
    {
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(
      `TMDB TV videos request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as TMDBVideosResponse;

  const selectedVideo =
    [...(data.results ?? [])]
      .filter(
        (video) =>
          Boolean(
            video.key?.trim()
          ) &&
          getTrailerPriority(video) >= 0
      )
      .sort(
        (first, second) => {
          const priorityDifference =
            getTrailerPriority(second) -
            getTrailerPriority(first);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          return (
            getPublishedTimestamp(second) -
            getPublishedTimestamp(first)
          );
        }
      )[0];

  const videoKey =
    selectedVideo?.key?.trim();

  if (!videoKey) {
    TRAILER_URL_CACHE.set(
      cacheKey,
      null
    );

    return undefined;
  }

  const trailerUrl =
    'https://www.youtube.com/watch?v=' +
    encodeURIComponent(videoKey);

  TRAILER_URL_CACHE.set(
    cacheKey,
    trailerUrl
  );

  return trailerUrl;
}

export async function searchMovies(
  query: string,
  topic?: string,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const apiKey = getApiKey();

  const response = await fetch(
    `${API_BASE_URL}/search/movie` +
      `?api_key=${apiKey}` +
      `&query=${encodeURIComponent(
        trimmedQuery
      )}` +
      `&include_adult=false`,
    {
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(
      `TMDB movie request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as TMDBSearchResponse<TMDBMovie>;

  let movies = data.results ?? [];

  const genreId =
    getTopicGenreId(
      'movies',
      topic
    );

  if (genreId) {
    movies = movies.filter((movie) =>
      movie.genre_ids?.includes(genreId)
    );
  }

  return movies
    .slice(0, 10)
    .map(movieToTop3Item);
}

export async function searchTvShows(
  query: string,
  topic?: string,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const apiKey = getApiKey();

  const response = await fetch(
    `${API_BASE_URL}/search/tv` +
      `?api_key=${apiKey}` +
      `&query=${encodeURIComponent(
        trimmedQuery
      )}` +
      `&include_adult=false`,
    {
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(
      `TMDB TV request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as TMDBSearchResponse<TMDBTvShow>;

  let tvShows = data.results ?? [];

  const genreId =
    getTopicGenreId(
      'tv',
      topic
    );

  if (genreId) {
    tvShows = tvShows.filter((show) =>
      show.genre_ids?.includes(genreId)
    );
  }

  return tvShows
    .slice(0, 10)
    .map(tvShowToTop3Item);
}

export async function getPopularMovies(
  topic?: string,
  limit = 5,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const movies =
    await fetchDiscoverPool<TMDBMovie>(
      'movies',
      topic,
      signal
    );

  return rankPopularMovies(movies)
    .slice(0, limit)
    .map(movieToTop3Item);
}

export async function getPopularTvShows(
  topic?: string,
  limit = 5,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const shows =
    await fetchDiscoverPool<TMDBTvShow>(
      'tv',
      topic,
      signal
    );

  return rankPopularTvShows(shows)
    .slice(0, limit)
    .map(tvShowToTop3Item);
}

export async function getMovieById(
  movieId: number
): Promise<Top3Item> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${API_BASE_URL}/movie/${movieId}` +
      `?api_key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(
      `TMDB movie request failed: ${response.status}`
    );
  }

  const movie =
    (await response.json()) as TMDBMovie;

  return movieToTop3Item(movie);
}

export async function getTvShowById(
  showId: number
): Promise<Top3Item> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${API_BASE_URL}/tv/${showId}` +
      `?api_key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(
      `TMDB TV request failed: ${response.status}`
    );
  }

  const show =
    (await response.json()) as TMDBTvShow;

  return tvShowToTop3Item(show);
}