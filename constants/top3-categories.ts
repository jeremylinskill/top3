export type Top3Topic = {
  id: string;
  name: string;
  icon: string;
  tmdbGenreId?: number;
  searchItemName: string;
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
        searchItemName: 'movie',
      },
      {
        id: 'horror',
        name: 'Horror',
        icon: '👻',
        tmdbGenreId: 27,
        searchItemName: 'horror movie',
      },
      {
        id: 'comedy',
        name: 'Comedy',
        icon: '😂',
        tmdbGenreId: 35,
        searchItemName: 'comedy movie',
      },
      {
        id: 'sci-fi',
        name: 'Sci-Fi',
        icon: '🚀',
        tmdbGenreId: 878,
        searchItemName: 'science fiction movie',
      },
    ],
  },
];