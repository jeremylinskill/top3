import { Top3Item } from '@/types/top3-item';

import {
  getPopularGames,
  searchGames,
} from './games';
import {
  getPopularBooks,
  searchBooks,
} from './google-books';
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
  movies: searchMovies,
  books: searchBooks,
  tv: searchTvShows,
  games: searchGames,
};

const POPULAR_SUGGESTIONS_PROVIDERS: Partial<
  Record<
    string,
    PopularSuggestionsProvider
  >
> = {
  movies: getPopularMovies,
  books: getPopularBooks,
  tv: getPopularTvShows,
  games: getPopularGames,
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