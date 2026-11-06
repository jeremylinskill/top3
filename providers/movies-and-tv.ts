import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import type { TmdbDiscoverProviderConfig } from '@/types/collection-option';
import { Top3Item } from '@/types/top3-item';
type TMDBGenre = {
  id: number;
  name: string;
};
type TMDBMovie = {
  id: number;
  title: string;
  original_title?: string;
  adult?: boolean;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  genres?: TMDBGenre[];
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
  genres?: TMDBGenre[];
};
type TMDBKnownForItem = {
  media_type?: string;
  title?: string;
  name?: string;
};
type TMDBPerson = {
  id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string;
  popularity?: number;
  known_for?: TMDBKnownForItem[];
};
type TMDBPersonMovieCredit = {
  id: number;
  title?: string;
  popularity?: number;
  vote_count?: number;
  release_date?: string;
  job?: string;
  department?: string;
};
type TMDBPersonMovieCreditsResponse = {
  cast?: TMDBPersonMovieCredit[];
  crew?: TMDBPersonMovieCredit[];
};
type TMDBSearchResponse<T> = {
  results?: T[];
  total_pages?: number;
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
const MOVIE_GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};
const TV_GENRE_NAMES: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};
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
  const releaseYear =
    movie.release_date?.slice(0, 4);
  const genres =
    movie.genres?.map((genre) => genre.name) ??
    movie.genre_ids
      ?.map(
        (genreId) =>
          MOVIE_GENRE_NAMES[genreId]
      )
      .filter(
        (genreName): genreName is string =>
          Boolean(genreName)
      );
  return {
    id: `movie-${movie.id}`,
    title: movie.title,
    subtitle: releaseYear,
    releaseYear,
    genres:
      genres && genres.length > 0
        ? genres
        : undefined,
    imageUrl: movie.poster_path
      ? `${IMAGE_BASE_URL}${movie.poster_path}`
      : undefined,
    rating: movie.vote_average,
  };
}
function tvShowToTop3Item(
  show: TMDBTvShow
): Top3Item {
  const releaseYear =
    show.first_air_date?.slice(0, 4);
  const genres =
    show.genres?.map((genre) => genre.name) ??
    show.genre_ids
      ?.map(
        (genreId) =>
          TV_GENRE_NAMES[genreId]
      )
      .filter(
        (genreName): genreName is string =>
          Boolean(genreName)
      );
  return {
    id: `tv-${show.id}`,
    title: show.name,
    subtitle: releaseYear,
    releaseYear,
    genres:
      genres && genres.length > 0
        ? genres
        : undefined,
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
function getMoviePeopleDepartment(type?: string) {
  const normalizedType =
    type?.trim().toLowerCase();
  if (normalizedType === 'actors') {
    return 'Acting';
  }
  if (normalizedType === 'directors') {
    return 'Directing';
  }
  return undefined;
}
function getPersonMovieTitles(
  person: TMDBPerson
) {
  const movieTitles = (person.known_for ?? [])
    .filter((item) => item.media_type === 'movie')
    .map((item) => item.title?.trim())
    .filter(
      (title): title is string => Boolean(title)
    );
  return [...new Set(movieTitles)].slice(0, 3);
}
function personToTop3Item(
  person: TMDBPerson,
  type: string,
  movieTitles?: string[]
): Top3Item {
  const normalizedType =
    type.trim().toLowerCase();
  const resolvedMovieTitles =
    movieTitles ?? getPersonMovieTitles(person);
  const roleLabel =
    normalizedType === 'directors'
      ? 'Director'
      : 'Actor';
  return {
    id: `person-${person.id}`,
    title: person.name,
    subtitle:
      resolvedMovieTitles.length > 0
        ? resolvedMovieTitles.slice(0, 3).join(' · ')
        : roleLabel,
    imageUrl: person.profile_path
      ? `${IMAGE_BASE_URL}${person.profile_path}`
      : undefined,
  };
}
function normalizePersonSearchValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
function rankMoviePeopleSearchResults(
  people: TMDBPerson[],
  query: string
) {
  const normalizedQuery =
    normalizePersonSearchValue(query);
  const ranked = [...people].sort(
    (first, second) => {
      const firstName =
        normalizePersonSearchValue(first.name);
      const secondName =
        normalizePersonSearchValue(second.name);
      const firstMatchRank =
        firstName === normalizedQuery
          ? 0
          : firstName.startsWith(normalizedQuery)
            ? 1
            : firstName.includes(normalizedQuery)
              ? 2
              : 3;
      const secondMatchRank =
        secondName === normalizedQuery
          ? 0
          : secondName.startsWith(normalizedQuery)
            ? 1
            : secondName.includes(normalizedQuery)
              ? 2
              : 3;
      if (firstMatchRank !== secondMatchRank) {
        return firstMatchRank - secondMatchRank;
      }
      const popularityDifference =
        (second.popularity ?? 0) -
        (first.popularity ?? 0);
      if (popularityDifference !== 0) {
        return popularityDifference;
      }
      const profileDifference =
        Number(Boolean(second.profile_path)) -
        Number(Boolean(first.profile_path));
      if (profileDifference !== 0) {
        return profileDifference;
      }
      return first.id - second.id;
    }
  );
  return ranked;
}
function getPersonCreditScore(
  credit: TMDBPersonMovieCredit
) {
  const popularity = Number.isFinite(credit.popularity)
    ? credit.popularity ?? 0
    : 0;
  const voteCount = Number.isFinite(credit.vote_count)
    ? credit.vote_count ?? 0
    : 0;
  return popularity + Math.log10(voteCount + 1) * 20;
}
function getRelevantPersonMovieCredits(
  credits: TMDBPersonMovieCreditsResponse,
  department: 'Acting' | 'Directing'
) {
  const relevantCredits =
    department === 'Acting'
      ? credits.cast ?? []
      : (credits.crew ?? []).filter(
          (credit) => credit.job === 'Director'
        );
  const uniqueByMovieId = new Map<
    number,
    TMDBPersonMovieCredit
  >();
  relevantCredits.forEach((credit) => {
    if (!uniqueByMovieId.has(credit.id)) {
      uniqueByMovieId.set(credit.id, credit);
    }
  });
  return Array.from(uniqueByMovieId.values()).sort(
    (first, second) =>
      getPersonCreditScore(second) -
      getPersonCreditScore(first)
  );
}
export async function searchMoviePeople(
  query: string,
  type: string,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }
  const department =
    getMoviePeopleDepartment(type);
  if (!department) {
    return [];
  }
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    api_key: apiKey,
    query: trimmedQuery,
    include_adult: 'false',
    language: 'en-US',
  });
  const response = await fetch(
    `${API_BASE_URL}/search/person?${params.toString()}`,
    { signal }
  );
  if (!response.ok) {
    throw new Error(
      `TMDB person request failed: ${response.status}`
    );
  }
  const data =
    (await response.json()) as TMDBSearchResponse<TMDBPerson>;
  const rankedPeople = rankMoviePeopleSearchResults(
    data.results ?? [],
    trimmedQuery
  ).slice(0, 10);
  const creditsResponses = await Promise.all(
    rankedPeople.map((person) =>
      fetch(
        `${API_BASE_URL}/person/${person.id}/movie_credits?` +
          new URLSearchParams({
            api_key: apiKey,
            language: 'en-US',
          }).toString(),
        { signal }
      )
    )
  );
  const results: Top3Item[] = [];
  const seenNames = new Set<string>();
  for (
    let index = 0;
    index < rankedPeople.length;
    index += 1
  ) {
    const creditsResponse = creditsResponses[index];
    if (!creditsResponse.ok) {
      continue;
    }
    const credits =
      (await creditsResponse.json()) as TMDBPersonMovieCreditsResponse;
    const relevantCredits =
      getRelevantPersonMovieCredits(
        credits,
        department
      );
    if (relevantCredits.length === 0) {
      continue;
    }
    const movieTitles = relevantCredits
      .map((credit) => credit.title?.trim())
      .filter(
        (title): title is string => Boolean(title)
      )
      .filter(
        (title, titleIndex, titles) =>
          titles.indexOf(title) === titleIndex
      )
      .slice(0, 3);
    const normalizedName =
      normalizePersonSearchValue(
        rankedPeople[index].name
      );
    if (seenNames.has(normalizedName)) {
      continue;
    }
    seenNames.add(normalizedName);
    results.push(
      personToTop3Item(
        rankedPeople[index],
        type,
        movieTitles
      )
    );
  }
  const normalizedQuery =
    normalizePersonSearchValue(trimmedQuery);
  const isFullNameQuery =
    normalizedQuery.includes(' ');
  const exactMatches = results.filter(
    (item) =>
      normalizePersonSearchValue(item.title) ===
      normalizedQuery
  );
  if (isFullNameQuery && exactMatches.length > 0) {
    return exactMatches.slice(0, 10);
  }
  return results.slice(0, 10);
}
type TMDBMovieCredits = {
  cast?: Array<{
    id: number;
    name: string;
    profile_path?: string | null;
    order?: number;
  }>;
  crew?: Array<{
    id: number;
    name: string;
    profile_path?: string | null;
    job?: string;
    department?: string;
  }>;
};
export async function getPopularMoviePeople(
  type: string,
  limit = 20,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const department =
    getMoviePeopleDepartment(type);
  if (!department) {
    return [];
  }
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    api_key: apiKey,
    include_adult: 'false',
    include_video: 'false',
    language: 'en-US',
    page: '1',
    sort_by: 'vote_count.desc',
    'vote_count.gte': '500',
  });
  const response = await fetch(
    `${API_BASE_URL}/discover/movie?${params.toString()}`,
    { signal }
  );
  if (!response.ok) {
    throw new Error(
      `TMDB movie discovery request failed: ${response.status}`
    );
  }
  const data =
    (await response.json()) as TMDBSearchResponse<TMDBMovie>;
  const movies = (data.results ?? []).slice(0, 20);
  const creditsResponses = await Promise.all(
    movies.map((movie) =>
      fetch(
        `${API_BASE_URL}/movie/${movie.id}/credits?` +
          new URLSearchParams({
            api_key: apiKey,
            language: 'en-US',
          }).toString(),
        { signal }
      )
    )
  );
  const scores = new Map<
    number,
    {
      person: TMDBPerson;
      score: number;
      movieTitles: string[];
    }
  >();
  for (let index = 0; index < movies.length; index += 1) {
    const movie = movies[index];
    const creditsResponse = creditsResponses[index];
    if (!creditsResponse.ok) {
      continue;
    }
    const credits =
      (await creditsResponse.json()) as TMDBMovieCredits;
    const movieVoteCount = movie.vote_count ?? 0;
    const movieVoteAverage = movie.vote_average ?? 0;
    const movieScore =
      Math.log10(movieVoteCount + 1) *
      (movieVoteAverage / 10);
    const people =
      department === 'Acting'
        ? (credits.cast ?? []).slice(0, 12)
        : (credits.crew ?? []).filter(
            (person) =>
              person.department === 'Directing' &&
              person.job === 'Director'
          );
    people.forEach((person, personIndex) => {
      const existing = scores.get(person.id);
      const positionBonus =
        department === 'Acting'
          ? Math.max(1, 12 - personIndex) / 4
          : 2;
      const score =
        movieScore + positionBonus;
      const movieTitle = movie.title.trim();
      if (existing) {
        existing.score += score;
        if (
          movieTitle &&
          existing.movieTitles.length < 3 &&
          !existing.movieTitles.includes(movieTitle)
        ) {
          existing.movieTitles.push(movieTitle);
        }
        return;
      }
      scores.set(person.id, {
        person: {
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: department,
        },
        score,
        movieTitles: movieTitle ? [movieTitle] : [],
      });
    });
  }
  return Array.from(scores.values())
    .sort((first, second) => second.score - first.score)
    .slice(0, limit)
    .map(({ person, movieTitles }) =>
      personToTop3Item(
        person,
        type,
        movieTitles
      )
    );
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
/**
 * Search within one actor's TMDB movie CAST credits. Never broaden a
 * zero-match search to the unrestricted movie catalogue (crew-only credits
 * are not eligible). Credits are cached briefly across successive queries.
 */
const ACTOR_CAST_SEARCH_CACHE = new Map<number, {
  expiresAt: number;
  movies: TMDBMovie[];
}>();
const ACTOR_CAST_CACHE_MS = 10 * 60 * 1000;

function normalizeMovieSearchText(value: string): string {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function movieTitleMatchRank(movie: TMDBMovie, query: string): number {
  const parts = query.split(' ').filter(Boolean);
  return Math.max(0, ...[movie.title, movie.original_title]
    .filter((title): title is string => Boolean(title))
    .map((title) => {
      const normalized = normalizeMovieSearchText(title);
      if (normalized === query) return 4;
      if (normalized.startsWith(query)) return 3;
      if (normalized.includes(query)) return 2;
      const words = normalized.split(' ');
      if (parts.every((part) => words.some((word) => word.startsWith(part)))) {
        return 1;
      }
      return 0;
    }));
}

export async function searchMoviesByActor(
  query: string,
  actorId: number,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const normalizedQuery = normalizeMovieSearchText(query);
  if (!normalizedQuery || !Number.isSafeInteger(actorId) || actorId <= 0) {
    return [];
  }
  const now = Date.now();
  const cached = ACTOR_CAST_SEARCH_CACHE.get(actorId);
  let cast = cached && cached.expiresAt > now ? cached.movies : undefined;
  if (!cast) {
    const params = new URLSearchParams({
      api_key: getApiKey(),
      language: 'en-US',
    });
    const response = await fetch(
      `${API_BASE_URL}/person/${actorId}/movie_credits?${params.toString()}`,
      { signal }
    );
    if (!response.ok) {
      throw new Error(`TMDB actor credits request failed: ${response.status}`);
    }
    const data = await response.json() as { cast?: TMDBMovie[] };
    const uniqueMovies = new Map<number, TMDBMovie>();
    (data.cast ?? []).forEach((movie) => {
      if (
        Number.isSafeInteger(movie.id) && movie.id > 0 &&
        typeof movie.title === 'string' && movie.title.trim() &&
        movie.adult !== true
      ) {
        uniqueMovies.set(movie.id, movie);
      }
    });
    cast = Array.from(uniqueMovies.values());
    ACTOR_CAST_SEARCH_CACHE.set(actorId, {
      movies: cast,
      expiresAt: Date.now() + ACTOR_CAST_CACHE_MS,
    });
  }
  return cast
    .map((movie) => ({ movie, matchRank: movieTitleMatchRank(movie, normalizedQuery) }))
    .filter(({ matchRank }) => matchRank > 0)
    .sort((a, b) => b.matchRank - a.matchRank ||
      getHybridPopularityScore(
        b.movie.vote_average, b.movie.vote_count, b.movie.popularity,
        getReleaseYear(b.movie.release_date)
      ) - getHybridPopularityScore(
        a.movie.vote_average, a.movie.vote_count, a.movie.popularity,
        getReleaseYear(a.movie.release_date)
      ))
    .slice(0, 10)
    .map(({ movie }) => movieToTop3Item(movie));
}

/**
 * Date-restricted title search: the TMDB movie-search endpoint has no
 * release-date parameter. Page through its title matches and accept only
 * movies whose dated release falls inside the configured period.
 */
export async function searchMoviesByReleasePeriod(
  query: string,
  fromDate?: string,
  toDate?: string,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const trimmed = query.trim();
  const validDate = (date?: string) =>
    !date || /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (
    !trimmed || (!fromDate && !toDate) ||
    !validDate(fromDate) || !validDate(toDate) ||
    (fromDate && toDate && fromDate > toDate)
  ) {
    return [];
  }
  const seen = new Set<number>();
  const matching: TMDBMovie[] = [];
  const pageLimit = 5;
  for (let page = 1; page <= pageLimit && matching.length < 10; page++) {
    const params = new URLSearchParams({
      api_key: getApiKey(),
      query: trimmed,
      include_adult: 'false',
      language: 'en-US',
      page: String(page),
    });
    const response = await fetch(
      `${API_BASE_URL}/search/movie?${params.toString()}`,
      { signal }
    );
    if (!response.ok) {
      throw new Error(`TMDB period movie search failed: ${response.status}`);
    }
    const data = await response.json() as TMDBSearchResponse<TMDBMovie>;
    const results = data.results ?? [];
    for (const movie of results) {
      const date = movie.release_date;
      if (
        !Number.isSafeInteger(movie.id) || seen.has(movie.id) ||
        movie.adult === true || !date ||
        (fromDate && date < fromDate) ||
        (toDate && date > toDate)
      ) continue;
      seen.add(movie.id);
      matching.push(movie);
      if (matching.length === 10) break;
    }
    if (!results.length || (typeof data.total_pages === 'number' &&
      page >= data.total_pages)) break;
  }
  return matching.slice(0, 10).map(movieToTop3Item);
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
/** Database-configured theme discovery. Keeps ordinary movie search untouched. */
async function getKeywordThemeMovieSuggestions(
  source: TmdbDiscoverProviderConfig,
  limit: number,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const rules = source.keywordRules ?? [];
  const excluded = new Set(source.excludedMovieIds ?? []);
  const now = new Date().toISOString().slice(0, 10);
  const minimumVotes = source.minimumVotes ?? 100;
  const apiKey = getApiKey();
  const existingKeywordMatches = new Map<number, Set<number>>();
  const candidates = new Map<number, {
    movie: TMDBMovie;
    weight: number;
  }>();

  // Query each keyword individually to reward titles supported by more
  // than one relevant concept; a single OR query loses that evidence.
  // The two strongest keywords get a second page for broader discovery.
  const requests = rules.flatMap((rule, index) =>
    Array.from({ length: index < 2 ? 2 : 1 }, (_, page) => {
      const params = new URLSearchParams({
        api_key: apiKey,
        include_adult: 'false',
        include_video: 'false',
        language: 'en-US',
        sort_by: 'vote_count.desc',
        'vote_count.gte': String(Math.max(20, minimumVotes)),
        with_keywords: String(rule.id),
        page: String(page + 1),
      });
      return { rule, url: `${API_BASE_URL}/discover/movie?${params}` };
    })
  );
  const responses = await Promise.all(requests.map(async ({ rule, url }) => {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`TMDB keyword discover failed: ${response.status}`);
    }
    const data = (await response.json()) as TMDBSearchResponse<TMDBMovie>;
    return { rule, movies: data.results ?? [] };
  }));
  responses.forEach(({ rule, movies }) => {
    movies.forEach((movie) => {
      const existing = candidates.get(movie.id);
      if (existing) {
        // Weight each keyword only once even if a movie appears on two pages.
        if (!existingKeywordMatches.get(movie.id)?.has(rule.id)) {
          existing.weight += rule.weight;
        }
      } else {
        candidates.set(movie.id, { movie, weight: rule.weight });
      }
      const matches = existingKeywordMatches.get(movie.id) ?? new Set<number>();
      matches.add(rule.id);
      existingKeywordMatches.set(movie.id, matches);
    });
  });

  const eligible = (movie: TMDBMovie, pinned = false) =>
    !excluded.has(movie.id) &&
    Boolean(movie.poster_path) &&
    Boolean(movie.release_date) &&
    (movie.release_date ?? '') <= now &&
    (pinned || (movie.vote_count ?? 0) >= minimumVotes);

  const pins = source.pinnedMovieIds ?? [];
  const resolvedPins = await Promise.all(pins.map(async (id) => {
    const response = await fetch(
      `${API_BASE_URL}/movie/${id}?api_key=${apiKey}&language=en-US`,
      { signal }
    );
    if (!response.ok) {
      // A removed curated title must not suppress all automatic suggestions.
      if (__DEV__) console.log('TMDB curated movie unavailable:', id);
      return null;
    }
    return (await response.json()) as TMDBMovie;
  }));
  const ranked = Array.from(candidates.values())
    .filter(({ movie }) => eligible(movie))
    .sort((first, second) => {
      const score = ({ movie, weight }: { movie: TMDBMovie; weight: number }) =>
        weight * 10 +
        Math.log1p(Math.max(0, movie.vote_count ?? 0)) * 0.55 +
        Math.log1p(Math.max(0, movie.popularity ?? 0)) * 0.32;
      return score(second) - score(first) || first.movie.id - second.movie.id;
    })
    .map(({ movie }) => movie);

  const output: TMDBMovie[] = [];
  const seen = new Set<number>();
  const caps = source.franchiseCaps ?? [];
  const groupCounts = new Map<string, number>();
  const add = (movie: TMDBMovie) => {
    if (!eligible(movie, true) || seen.has(movie.id) || output.length >= limit) return;
    const title = movie.title.toLowerCase();
    const cap = caps.find((rule) => title.includes(rule.term.toLowerCase()));
    if (cap) {
      const count = groupCounts.get(cap.term) ?? 0;
      if (count >= cap.max) return;
      groupCounts.set(cap.term, count + 1);
    }
    output.push(movie);
    seen.add(movie.id);
  };
  resolvedPins.forEach((movie) => { if (movie) add(movie); });
  ranked.forEach(add);
  return output.map(movieToTop3Item);
}

/**
 * An editorially verified list for company themes that also include
 * distributor/exclusive titles. TMDB company credits alone can't represent them.
 * IDs are stored on the theme itself; never apply them to another company.
 * Returning fewer than requested is preferable to unrelated filler.
 */
const featuredMovieCache = new Map<number, { movie: TMDBMovie; expiresAt: number }>();

async function getFeaturedCompanyMovieSuggestions(
  source: TmdbDiscoverProviderConfig,
  limit: number,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const ids = [...new Set(source.featuredMovieIds ?? [])].slice(0, 30);
  const apiKey = getApiKey();
  const today = new Date().toISOString().slice(0, 10);
  const responses = await Promise.allSettled(ids.map(async (id) => {
    const cached = featuredMovieCache.get(id);
    if (cached && cached.expiresAt > Date.now()) return cached.movie;
    const response = await fetch(
      `${API_BASE_URL}/movie/${id}?${new URLSearchParams({
        api_key: apiKey,
        language: 'en-US',
      })}`,
      { signal }
    );
    if (!response.ok) throw new Error(`TMDB movie ${id}: ${response.status}`);
    const movie = (await response.json()) as TMDBMovie;
    // Refuse mismatched identifiers rather than showing the wrong film.
    if (movie.id !== id) throw new Error(`Unexpected TMDB movie for ${id}`);
    featuredMovieCache.set(id, { movie, expiresAt: Date.now() + 15 * 60 * 1000 });
    return movie;
  }));
  if (signal?.aborted) throw new Error('Preview cancelled.');
  if (responses.every((result) => result.status === 'rejected')) {
    throw new Error('Could not load featured movies from TMDB. Try again.');
  }
  const movies = responses.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : []
  ).filter((movie) =>
    Boolean(movie.poster_path) && Boolean(movie.release_date) &&
    (movie.release_date ?? '') <= today
  );
  // Audience engagement orders only the verified choices; it never makes
  // an ineligible movie eligible.
  movies.sort((a, b) => {
    const score = (movie: TMDBMovie) =>
      Math.log1p(Math.max(0, movie.vote_count ?? 0)) * 2 +
      Math.log1p(Math.max(0, movie.popularity ?? 0)) * 0.5;
    return score(b) - score(a) || a.id - b.id;
  });
  return movies.slice(0, limit).map(movieToTop3Item);
}

export async function getThemeMovieSuggestions(
  source: TmdbDiscoverProviderConfig,
  limit = 20,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  if (source.keywordRules?.length) {
    return getKeywordThemeMovieSuggestions(source, limit, signal);
  }
  if (
    source.withCompanies &&
    source.featuredCompanyId === source.withCompanies &&
    source.featuredMovieIds?.length
  ) {
    return getFeaturedCompanyMovieSuggestions(source, limit, signal);
  }
  const apiKey = getApiKey();
  const params = new URLSearchParams();
  params.set(
    'api_key',
    apiKey
  );
  params.set(
    'include_adult',
    'false'
  );
  params.set(
    'include_video',
    'false'
  );
  params.set(
    'language',
    'en-US'
  );
  params.set(
    'page',
    '1'
  );
  params.set(
    'sort_by',
    'popularity.desc'
  );
  params.set(
    'vote_count.gte',
    '50'
  );
  if (
    source.primaryReleaseDateGte
  ) {
    params.set(
      'primary_release_date.gte',
      source.primaryReleaseDateGte
    );
  }
  if (
    source.primaryReleaseDateLte
  ) {
    params.set(
      'primary_release_date.lte',
      source.primaryReleaseDateLte
    );
  }
  if (
    source.withPeople !== undefined
  ) {
    params.set(
      'with_cast',
      source.withPeople.toString()
    );
  }
  if (
    source.withCompanies !== undefined
  ) {
    params.set(
      'with_companies',
      source.withCompanies.toString()
    );
  }
  const response = await fetch(
    `${API_BASE_URL}/discover/movie?${params.toString()}`,
    {
      signal,
    }
  );
  if (!response.ok) {
    throw new Error(
      `TMDB theme suggestion request failed: ${response.status}`
    );
  }
  const data =
    (await response.json()) as TMDBSearchResponse<TMDBMovie>;
  const movies =
    data.results ?? [];
  return rankPopularMovies(movies)
    .slice(0, limit)
    .map(movieToTop3Item);
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

/** Admin-only UX helper; TMDB key remains the app's existing public TMDB key. */
export async function searchTmdbMovieKeywords(
  query: string,
  signal?: AbortSignal
): Promise<{ id: number; name: string }[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const params = new URLSearchParams({
    api_key: getApiKey(),
    query: trimmed,
    page: '1',
  });
  const response = await fetch(
    `${API_BASE_URL}/search/keyword?${params.toString()}`,
    { signal }
  );
  if (!response.ok) throw new Error(`TMDB keyword lookup failed: ${response.status}`);
  const data = await response.json() as {
    results?: { id: number; name: string }[];
  };
  return (data.results ?? [])
    .filter((entry) => Number.isSafeInteger(entry.id) && Boolean(entry.name))
    .slice(0, 18);
}


/** Lightweight TMDB actor picker for the Admin Movie Theme editor. */
export async function searchTmdbMovieActors(
  query: string,
  signal?: AbortSignal
): Promise<{ id: number; name: string; knownFor: string[] }[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const params = new URLSearchParams({
    api_key: getApiKey(),
    query: trimmed,
    include_adult: 'false',
    language: 'en-US',
    page: '1',
  });
  const response = await fetch(`${API_BASE_URL}/search/person?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`TMDB actor lookup failed: ${response.status}`);
  const data = await response.json() as TMDBSearchResponse<TMDBPerson>;
  return rankMoviePeopleSearchResults((data.results ?? []).filter((person) =>
    Number.isSafeInteger(person.id) && person.id > 0 &&
    typeof person.name === 'string' && person.name.trim().length > 0 &&
    (!person.known_for_department || person.known_for_department === 'Acting')
  ), trimmed).slice(0, 12).map((person) => ({
    id: person.id,
    name: person.name,
    knownFor: (person.known_for ?? [])
      .filter((item) => item.media_type === 'movie' && Boolean(item.title))
      .map((item) => item.title!.trim())
      .filter(Boolean)
      .slice(0, 2),
  }));
}

/** Fetch the canonical display name for an actor already saved in a theme. */
export async function getTmdbMovieActorById(
  id: number,
  signal?: AbortSignal
): Promise<{ id: number; name: string }> {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid TMDB person ID.');
  const response = await fetch(
    `${API_BASE_URL}/person/${id}?${new URLSearchParams({ api_key: getApiKey() }).toString()}`,
    { signal }
  );
  if (!response.ok) throw new Error(`TMDB person lookup failed: ${response.status}`);
  const person = await response.json() as TMDBPerson;
  if (person.id !== id || !person.name) throw new Error('Invalid TMDB person response.');
  return { id: person.id, name: person.name };
}


/** Find production companies by name; results are not streaming-distribution rights. */
export async function searchTmdbMovieCompanies(
  query: string,
  signal?: AbortSignal
): Promise<{ id: number; name: string; originCountry: string }[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const params = new URLSearchParams({
    api_key: getApiKey(), query: trimmed, page: '1',
  });
  const response = await fetch(
    `${API_BASE_URL}/search/company?${params.toString()}`, { signal }
  );
  if (!response.ok) throw new Error(`TMDB company lookup failed: ${response.status}`);
  const data = await response.json() as { results?: {
    id: number; name: string; origin_country?: string | null;
  }[] };
  return (data.results ?? [])
    .filter((item) => Number.isSafeInteger(item.id) && item.id > 0 && Boolean(item.name))
    .slice(0, 18)
    .map((item) => ({ id: item.id, name: item.name, originCountry: item.origin_country ?? '' }));
}

/** Resolve the saved company ID to its authoritative TMDB name. */
export async function getTmdbMovieCompanyById(
  id: number,
  signal?: AbortSignal
): Promise<{ id: number; name: string }> {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid TMDB company ID.');
  const response = await fetch(
    `${API_BASE_URL}/company/${id}?${new URLSearchParams({ api_key: getApiKey() }).toString()}`,
    { signal }
  );
  if (!response.ok) throw new Error(`TMDB company lookup failed: ${response.status}`);
  const data = await response.json() as { id: number; name: string };
  if (data.id !== id || !data.name) throw new Error('TMDB returned an invalid company.');
  return { id: data.id, name: data.name };
}
