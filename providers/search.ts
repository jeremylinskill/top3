import {
  MusicianRole,
} from '@/lib/supabase/musicians';
import {
  CollectionOption,
  TmdbDiscoverProviderConfig,
} from '@/types/collection-option';
import { Top3Item } from '@/types/top3-item';

import {
  getPopularBooks,
  searchBooks,
} from './books';
import {
  getPopularMovies,
  getPopularTvShows,
  getThemeMovieSuggestions,
  searchMovies,
  searchTvShows,
} from './movies-and-tv';
import {
  getPopularAlbums,
  getPopularArtists,
  getPopularSongs,
  searchAlbums,
  searchArtists,
  searchSongs,
} from './music';
import {
  getPopularMusicians,
  searchMusicians,
} from './musicians';
import {
  getPopularPodcasts,
  searchPodcasts,
} from './podcasts';
import {
  getPopularGames,
  searchGames,
} from './video-games';

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

const MUSICIAN_ROLES = new Set<MusicianRole>([
  'vocalist',
  'guitarist',
  'drummer',
  'bassist',
  'mc',
  'dj',
]);

const SEARCH_PROVIDERS: Record<
  string,
  SearchProvider
> = {
  albums: searchAlbums,
  artists: searchArtists,
  books: searchBooks,
  games: searchGames,
  movies: searchMovies,
  podcasts: searchPodcasts,
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
  podcasts: getPopularPodcasts,
  songs: getPopularSongs,
  tv: getPopularTvShows,
};

function getMusicianRole(
  option?: CollectionOption
): MusicianRole | undefined {
  if (
    option?.providerKey !==
      'top3_catalogue' ||
    option.providerMode !==
      'musician_role'
  ) {
    return undefined;
  }

  const role =
    option.providerConfig.role;

  if (
    typeof role !== 'string' ||
    !MUSICIAN_ROLES.has(
      role as MusicianRole
    )
  ) {
    return undefined;
  }

  return role as MusicianRole;
}

function getTmdbDiscoverProviderConfig(
  option?: CollectionOption
): TmdbDiscoverProviderConfig | undefined {
  if (
    option?.providerKey !== 'tmdb' ||
    option.providerMode !== 'discover'
  ) {
    return undefined;
  }

  const config = option.providerConfig;

  return {
    ...(typeof config.primaryReleaseDateGte === 'string'
      ? {
          primaryReleaseDateGte:
            config.primaryReleaseDateGte,
        }
      : {}),
    ...(typeof config.primaryReleaseDateLte === 'string'
      ? {
          primaryReleaseDateLte:
            config.primaryReleaseDateLte,
        }
      : {}),
    ...(typeof config.withPeople === 'number'
      ? {
          withPeople: config.withPeople,
        }
      : {}),
    ...(typeof config.withCompanies === 'number'
      ? {
          withCompanies:
            config.withCompanies,
        }
      : {}),
  };
}

export function getSearchProvider(
  categoryId: string,
  collectionOption?: CollectionOption
): SearchProvider | undefined {
  const musicianRole =
    getMusicianRole(
      collectionOption
    );

  if (musicianRole) {
    return (
      query,
      _topic,
      signal
    ) =>
      searchMusicians(
        query,
        musicianRole,
        signal
      );
  }

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
  signal?: AbortSignal,
  collectionOption?: CollectionOption
): Promise<Top3Item[]> {
  const provider =
    getSearchProvider(
      categoryId,
      collectionOption
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
  signal?: AbortSignal,
  collectionOption?: CollectionOption
): Promise<Top3Item[]> {
  const musicianRole =
    getMusicianRole(
      collectionOption
    );

  if (musicianRole) {
    return getPopularMusicians(
      musicianRole,
      limit,
      signal
    );
  }

  const tmdbDiscoverConfig =
    getTmdbDiscoverProviderConfig(
      collectionOption
    );

  if (tmdbDiscoverConfig) {
    return getThemeMovieSuggestions(
      tmdbDiscoverConfig,
      limit,
      signal
    );
  }

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
