export type FeaturedDiscoverTopic = {
  categoryId: string;
  topic: string;
};

export const FEATURED_DISCOVER_TOPICS: FeaturedDiscoverTopic[] =
  [
    {
      categoryId: 'movies',
      topic: 'Action',
    },
    {
      categoryId: 'movies',
      topic: 'Comedy',
    },
    {
      categoryId: 'tv',
      topic: 'Reality',
    },
  ];

export const FEATURED_DISCOVER_CATEGORY_IDS = [
  'movies',
  'tv',
  'books',
] as const;

export const MIN_TRENDING_TOPICS = 3;

export const MIN_TRENDING_CATEGORIES = 3;