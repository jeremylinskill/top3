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
import { searchBooksByType } from './book-types';
import {
  getPopularMovies,
  getPopularTvShows,
  getThemeMovieSuggestions,
  searchMovies,
  searchMoviesByActor,
  searchMoviesByReleasePeriod,
  searchTvShows,
} from './movies-and-tv';
import {
  getCurrentChartArtists,
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

export function getMusicianRole(
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
    ...(typeof config.featuredCompanyId === 'number' &&
        Number.isSafeInteger(config.featuredCompanyId) &&
        config.featuredCompanyId > 0
      ? { featuredCompanyId: config.featuredCompanyId }
      : {}),
    ...(Array.isArray(config.featuredMovieIds)
      ? { featuredMovieIds: config.featuredMovieIds.filter(
          (id): id is number => Number.isSafeInteger(id) && id > 0
        ).slice(0, 30) }
      : {}),
    ...(Array.isArray(config.keywordRules)
      ? {
          keywordRules: config.keywordRules.filter(
            (rule): rule is { id: number; weight: number } =>
              typeof rule === 'object' && rule !== null &&
              Number.isInteger(rule.id) && rule.id > 0 &&
              typeof rule.weight === 'number' &&
              Number.isFinite(rule.weight) && rule.weight > 0
          ).slice(0, 8),
        }
      : {}),
    ...(Array.isArray(config.pinnedMovieIds)
      ? { pinnedMovieIds: config.pinnedMovieIds.filter(
          (id): id is number => Number.isInteger(id) && id > 0
        ).slice(0, 20) }
      : {}),
    ...(Array.isArray(config.excludedMovieIds)
      ? { excludedMovieIds: config.excludedMovieIds.filter(
          (id): id is number => Number.isInteger(id) && id > 0
        ).slice(0, 100) }
      : {}),
    ...(typeof config.minimumVotes === 'number' &&
        Number.isFinite(config.minimumVotes) && config.minimumVotes >= 0
      ? { minimumVotes: Math.floor(config.minimumVotes) }
      : {}),
    ...(Array.isArray(config.franchiseCaps)
      ? { franchiseCaps: config.franchiseCaps.filter(
          (rule): rule is { term: string; max: number } =>
            typeof rule === 'object' && rule !== null &&
            typeof rule.term === 'string' &&
            rule.term.trim().length > 0 && rule.term.length <= 50 &&
            Number.isInteger(rule.max) && rule.max >= 1
        ).slice(0, 10) }
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

  // Objective Movie Theme criteria must constrain SEARCH as well as
  // suggestions. Other Movie Themes keep their existing search behaviour.
  if (categoryId === 'movies' && collectionOption?.kind === 'theme') {
    const config = getTmdbDiscoverProviderConfig(collectionOption);
    if (config?.withPeople && !config.withCompanies &&
        !config.keywordRules?.length) {
      return (query, _topic, signal) =>
        searchMoviesByActor(query, config.withPeople!, signal);
    }
    if ((config?.primaryReleaseDateGte || config?.primaryReleaseDateLte) &&
        !config.withPeople && !config.withCompanies &&
        !config.keywordRules?.length) {
      return (query, _topic, signal) =>
        searchMoviesByReleasePeriod(
          query,
          config.primaryReleaseDateGte,
          config.primaryReleaseDateLte,
          signal
        );
    }
  }

  // Song recording-version filters run in the Edge Function
  // before the final result limit. Collaborations stay unrestricted.
  const songType =
    categoryId !== 'songs'
      ? undefined
      : collectionOption?.id === 'songs-type-live'
        ? 'live'
        : collectionOption?.id === 'songs-type-acoustic'
          ? 'acoustic'
          : collectionOption?.id === 'songs-type-remixes'
            ? 'remix'
            : undefined;

  if (songType) {
    return (query, topic, signal) =>
      searchSongs(query, topic, signal, songType);
  }

  // Live Album filtering happens before the Edge Function's
  // final result limit, not after it reaches the app.
  if (
    categoryId === 'albums' &&
    collectionOption?.id === 'albums-type-live'
  ) {
    return (query, topic, signal) =>
      searchAlbums(query, topic, signal, false, true);
  }

  // Compilation filtering happens in the Edge Function,
  // before its final album result limit.
  if (
    categoryId === 'albums' &&
    collectionOption?.id === 'albums-type-compilations'
  ) {
    return (query, topic, signal) =>
      searchAlbums(query, topic, signal, true);
  }

  // Show only albums with evidence that they are soundtracks.
  // Apple Music may categorize genuine soundtracks under other genres.
  if (
    categoryId === 'albums' &&
    collectionOption?.id === 'albums-type-soundtracks'
  ) {
    return async (query, topic, signal) => {
      const albums = await searchAlbums(
        query,
        topic,
        signal
      );

      return albums.filter((album) => {
        const matchesSoundtrackGenre =
          album.genres?.some((genre) =>
            /\bsoundtracks?\b/i.test(genre)
          ) ?? false;

        const matchesSoundtrackTitle =
          /\bsoundtracks?\b|original motion picture score|film score|music from the motion picture/i.test(
            album.title
          );

        return (
          matchesSoundtrackGenre ||
          matchesSoundtrackTitle
        );
      });
    };
  }

  if (
    categoryId === 'games' &&
    collectionOption?.kind === 'type'
  ) {
    const gameType = collectionOption.providerConfig?.gameType;
    const supportedTypes = [
      'single-player',
      'online-multiplayer',
      'local-coop',
      'online-coop',
      'open-world',
    ];

    if (
      typeof gameType === 'string' &&
      supportedTypes.includes(gameType)
    ) {
      return (query, topic, signal) =>
        searchGames(query, topic, signal, gameType);
    }
  }

  // Book-format searches rely on catalogue metadata, not Genre subjects.
  if (categoryId === 'books' && collectionOption?.kind === 'type') {
    const bookType = collectionOption.providerConfig?.bookType;
    if (typeof bookType === 'string') {
      return (query, _topic, signal) =>
        searchBooksByType(query, bookType, signal);
    }
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
  collectionOption?: CollectionOption,
  skipBookArtwork = false
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

  if (
    collectionOption?.providerKey === 'apple_music' &&
    collectionOption.providerMode === 'current_chart'
  ) {
    return getCurrentChartArtists(
      undefined,
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

  if (skipBookArtwork && provider === getPopularBooks) {
    // The Search screen shows text-only suggestion chips.
    return getPopularBooks(topic, limit, signal, false);
  }

  return provider(
    topic,
    limit,
    signal
  );
}
