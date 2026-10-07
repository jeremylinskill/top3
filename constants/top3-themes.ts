export type Top3ThemeSuggestionSource = {
  type: 'tmdbDiscover';
  primaryReleaseDateGte?: string;
  primaryReleaseDateLte?: string;
  withPeople?: number;
  withCompanies?: number;
};

export type Top3ThemeGroup =
  | 'mood'
  | 'people'
  | 'era'
  | 'studio'
  | 'franchise'
  | 'platform'
  | 'personal';

export type Top3Theme = {
  id: string;
  category: 'movies';
  name: string;
  group: Top3ThemeGroup;

  /**
   * Used for search, suggestions and future discovery features.
   */
  keywords: string[];

  /**
   * Short explanation of the theme.
   */
  browseLabel?: string;

  /**
   * Example search prompts or suggestion ideas.
   */
  searchHints?: string[];

  /**
   * Appears in the initial Featured section.
   */
  featured?: boolean;

  /**
   * Can appear in Trending when enough activity exists.
   */
  trendingEnabled?: boolean;

  /**
   * Defines how suggestions should be generated
   * for this theme.
   */
  suggestionSource?: Top3ThemeSuggestionSource;
};

export const TOP3_THEMES: Top3Theme[] = [
  {
    id: 'comfort-movies',
    category: 'movies',
    name: 'Comfort Movies',
    group: 'mood',
    browseLabel:
      'Familiar, reassuring films that can be watched over and over again',
    keywords: [
      'comfort',
      'cozy',
      'feel good',
      'feel-good',
      'happy',
      'nostalgia',
      'rewatch',
    ],
    searchHints: [
      'Feel-good favourites',
      'Movies you watch again and again',
      'Nostalgic movies',
    ],
    featured: true,
    trendingEnabled: true,
  },
  {
    id: 'never-get-tired-of',
    category: 'movies',
    name: 'Movies I Never Get Tired Of',
    group: 'personal',
    browseLabel:
      'The ones that never lose their appeal',
    keywords: [
      'rewatch',
      'repeat',
      'favourites',
      'favorites',
      'never gets old',
    ],
    searchHints: [
      'Movies I can watch forever',
      'All-time favourites',
      'Instant rewatches',
    ],
    featured: true,
    trendingEnabled: true,
  },
  {
    id: 'tom-cruise-movies',
    category: 'movies',
    name: 'Tom Cruise Movies',
    suggestionSource: {
      type: 'tmdbDiscover',
      withPeople: 500,
    },
    group: 'people',
    browseLabel:
      'Favourite movies starring Tom Cruise',
    keywords: [
      'tom cruise',
      'actor',
    ],
    searchHints: [
      'Mission Impossible',
      'Top Gun',
      'Best Tom Cruise performances',
    ],
    trendingEnabled: true,
  },
  {
    id: 'netflix-originals',
    category: 'movies',
    name: 'Netflix Originals',
    suggestionSource: {
      type: 'tmdbDiscover',
      withCompanies: 178464,
    },
    group: 'platform',
    browseLabel:
      'Exclusive to the streaming service',
    keywords: [
      'netflix',
      'netflix original',
      'netflix originals',
      'streaming',
    ],
    searchHints: [
      'Best Netflix Originals',
      'Netflix exclusives',
      'Hidden Netflix gems',
    ],
    trendingEnabled: true,
  },
  {
    id: '1980s-movies',
    category: 'movies',
    name: '1980s Movies',
    suggestionSource: {
      type: 'tmdbDiscover',
      primaryReleaseDateGte: '1980-01-01',
      primaryReleaseDateLte: '1989-12-31',
    },
    group: 'era',
    browseLabel:
      'The films that defined the era and its unique style',
    keywords: [
      '1980s',
      '1980',
      '80s',
      'eighties',
    ],
    searchHints: [
      'Best 80s movies',
      '80s classics',
      'Movies from the eighties',
    ],
    featured: true,
    trendingEnabled: true,
  },
  {
    id: 'movies-that-made-me-cry',
    category: 'movies',
    name: 'Movies That Made Me Cry',
    group: 'mood',
    browseLabel:
      'The ones that hit hard emotionally',
    keywords: [
      'cry',
      'sad',
      'emotional',
      'tearjerker',
    ],
    searchHints: [
      'Emotional movies',
      'Movies that made me cry',
      'Powerful stories',
    ],
    featured: true,
    trendingEnabled: true,
  },
  {
    id: 'see-again-first-time',
    category: 'movies',
    name: 'Movies I Wish I Could See Again for the First Time',
    group: 'personal',
    browseLabel:
      'Unforgettable first-watch experiences',
    keywords: [
      'first time',
      'experience again',
      'surprise',
      'twist',
      'unforgettable',
    ],
    searchHints: [
      'Movies with amazing twists',
      'Unforgettable first watches',
      'Movies that surprised me',
    ],
    trendingEnabled: true,
  },
];

export function getThemesForCategory(
  category: Top3Theme['category']
) {
  return TOP3_THEMES.filter(
    (theme) => theme.category === category
  );
}
