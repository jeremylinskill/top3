export type Top3Topic = {
  id: string;
  name: string;
  icon: string;
  tmdbGenreId?: number;
};

export type Top3Category = {
  id: string;
  name: string;
  icon: string;
  topics: Top3Topic[];
};

export const TOP3_CATEGORIES: Top3Category[] = [
  {
    id: 'movies',
    name: 'Movies',
    icon: '🎬',
    topics: [
      {
        id: 'general',
        name: 'General',
        icon: '🎬',
      },
      {
        id: 'horror',
        name: 'Horror',
        icon: '👻',
        tmdbGenreId: 27,
      },
      {
        id: 'comedy',
        name: 'Comedy',
        icon: '😂',
        tmdbGenreId: 35,
      },
      {
        id: 'sci-fi',
        name: 'Sci-Fi',
        icon: '🚀',
        tmdbGenreId: 878,
      },
    ],
  },
];