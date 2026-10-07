import {
  TOP3_THEMES,
  Top3ThemeSuggestionSource,
} from '@/constants/top3-themes';
import { CollectionOption } from '@/types/collection-option';

function getThemeProviderFields(
  suggestionSource?: Top3ThemeSuggestionSource
): Pick<
  CollectionOption,
  'providerKey' | 'providerMode' | 'providerConfig'
> {
  if (!suggestionSource) {
    return {
      providerMode: 'curated',
      providerConfig: {},
    };
  }

  return {
    providerKey: 'tmdb',
    providerMode: 'discover',
    providerConfig: {
      ...(suggestionSource.primaryReleaseDateGte
        ? {
            primaryReleaseDateGte:
              suggestionSource.primaryReleaseDateGte,
          }
        : {}),
      ...(suggestionSource.primaryReleaseDateLte
        ? {
            primaryReleaseDateLte:
              suggestionSource.primaryReleaseDateLte,
          }
        : {}),
      ...(suggestionSource.withPeople !== undefined
        ? {
            withPeople:
              suggestionSource.withPeople,
          }
        : {}),
      ...(suggestionSource.withCompanies !== undefined
        ? {
            withCompanies:
              suggestionSource.withCompanies,
          }
        : {}),
    },
  };
}

const MOVIE_TYPE_FALLBACKS: CollectionOption[] = [
  {
    id: 'movies-type-actors',
    slug: 'actors',
    categoryId: 'movies',
    kind: 'type',
    name: 'Actors',
    groupName: 'people',
    keywords: [],
    searchHints: [],
    featured: false,
    trendingEnabled: false,
    active: true,
    displayOrder: 10,
    entityKind: 'person',
    providerKey: 'tmdb',
    providerMode: 'movie_person',
    providerConfig: {
      personType: 'actors',
    },
  },
  {
    id: 'movies-type-directors',
    slug: 'directors',
    categoryId: 'movies',
    kind: 'type',
    name: 'Directors',
    groupName: 'people',
    keywords: [],
    searchHints: [],
    featured: false,
    trendingEnabled: false,
    active: true,
    displayOrder: 20,
    entityKind: 'person',
    providerKey: 'tmdb',
    providerMode: 'movie_person',
    providerConfig: {
      personType: 'directors',
    },
  },
];

const MOVIE_THEME_FALLBACKS: CollectionOption[] =
  TOP3_THEMES.map((theme, index) => ({
    id: `movies-theme-${theme.id}`,
    slug: theme.id,
    categoryId: theme.category,
    kind: 'theme',
    name: theme.name,
    groupName: theme.group,
    browseLabel: theme.browseLabel,
    keywords: theme.keywords,
    searchHints: theme.searchHints ?? [],
    featured: theme.featured ?? false,
    trendingEnabled:
      theme.trendingEnabled ?? false,
    active: true,
    displayOrder: (index + 1) * 10,
    entityKind: 'movie',
    ...getThemeProviderFields(
      theme.suggestionSource
    ),
  }));

export const BUNDLED_COLLECTION_OPTIONS: CollectionOption[] = [
  ...MOVIE_TYPE_FALLBACKS,
  ...MOVIE_THEME_FALLBACKS,
];
