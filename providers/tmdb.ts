import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { Top3Item } from '@/types/top3-item';

type TMDBMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
};

type TMDBTvShow = {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
};

type TMDBSearchResponse<T> = {
  results?: T[];
};

const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

function getApiKey() {
  const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;

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

  const selectedTopic = category?.topics.find(
    (item) =>
      item.name.toLowerCase() === topic.toLowerCase()
  );

  return selectedTopic?.tmdbGenreId;
}

function movieToTop3Item(movie: TMDBMovie): Top3Item {
  return {
    id: `movie-${movie.id}`,
    title: movie.title,
    subtitle: movie.release_date?.slice(0, 4),
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
    subtitle: show.first_air_date?.slice(0, 4),
    imageUrl: show.poster_path
      ? `${IMAGE_BASE_URL}${show.poster_path}`
      : undefined,
    rating: show.vote_average,
  };
}

export async function searchMovies(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const apiKey = getApiKey();

  const response = await fetch(
    `${API_BASE_URL}/search/movie` +
      `?api_key=${apiKey}` +
      `&query=${encodeURIComponent(trimmedQuery)}` +
      `&include_adult=false`
  );

  if (!response.ok) {
    throw new Error(
      `TMDB movie request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as TMDBSearchResponse<TMDBMovie>;

  let movies = data.results ?? [];
  const genreId = getTopicGenreId('movies', topic);

  if (genreId) {
    movies = movies.filter((movie) =>
      movie.genre_ids?.includes(genreId)
    );
  }

  return movies.slice(0, 10).map(movieToTop3Item);
}

export async function searchTvShows(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const apiKey = getApiKey();

  const response = await fetch(
    `${API_BASE_URL}/search/tv` +
      `?api_key=${apiKey}` +
      `&query=${encodeURIComponent(trimmedQuery)}` +
      `&include_adult=false`
  );

  if (!response.ok) {
    throw new Error(
      `TMDB TV request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as TMDBSearchResponse<TMDBTvShow>;

  let tvShows = data.results ?? [];
  const genreId = getTopicGenreId('tv', topic);

  if (genreId) {
    tvShows = tvShows.filter((show) =>
      show.genre_ids?.includes(genreId)
    );
  }

  return tvShows.slice(0, 10).map(tvShowToTop3Item);
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

  const movie = (await response.json()) as TMDBMovie;

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