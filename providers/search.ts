import { Top3Item } from '@/types/top3-item';

import {
  getPopularGames,
  searchGames,
} from './video-games';
import {
  getPopularBooks,
  searchBooks,
} from './google-books';
import {
  getPopularAlbums,
  getPopularArtists,
  getPopularSongs,
  searchAlbums,
  searchArtists,
  searchSongs,
} from './music';
import {
  getPopularMovies,
  getPopularTvShows,
  searchMovies,
  searchTvShows,
} from './tmdb';

export type SearchProvider = (
  query: string,
  topic?: string,
  signal?: AbortSignal
) => Promise<Top3Item[]>;

export type PopularSuggestionsProvider = (
  topic?: string,
  limit?: number,
  signal?: AbortSignal
) => Promise<Top3Item[]>;

const SEARCH_PROVIDERS: Record<
  string,
  SearchProvider
> = {
  albums: searchAlbums,
  artists: searchArtists,
  books: searchBooks,
  games: searchGames,
  movies: searchMovies,
  songs: searchSongs,
  tv: searchTvShows,
};

const POPULAR_SUGGESTIONS_PROVIDERS: Partial<
  Record<
    string,
    PopularSuggestionsProvider
  >
> = {
  albums: getPopularAlbums,
  artists: getPopularArtists,
  books: getPopularBooks,
  games: getPopularGames,
  movies: getPopularMovies,
  songs: getPopularSongs,
  tv: getPopularTvShows,
};

export function getSearchProvider(
  categoryId: string
): SearchProvider | undefined {
  return SEARCH_PROVIDERS[
    categoryId
  ];
}

export function getPopularSuggestionsProvider(
  categoryId: string
): PopularSuggestionsProvider | undefined {
  return POPULAR_SUGGESTIONS_PROVIDERS[
    categoryId
  ];
}

export async function searchByCategory(
  categoryId: string,
  query: string,
  topic?: string,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const provider =
    getSearchProvider(
      categoryId
    );

  if (!provider) {
    throw new Error(
      `No search provider exists for category: ${categoryId}`
    );
  }

  return provider(
    query,
    topic,
    signal
  );
}

export async function getPopularSuggestionsByCategory(
  categoryId: string,
  topic?: string,
  limit = 5,
  signal?: AbortSignal
): Promise<Top3Item[]> {
  const provider =
    getPopularSuggestionsProvider(
      categoryId
    );

  if (!provider) {
    return [];
  }

  return provider(
    topic,
    limit,
    signal
  );
}