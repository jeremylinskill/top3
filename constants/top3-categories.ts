export type Top3Topic = {
  id: string;
  name: string;
  icon: string;
  searchItemName: string;
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
        searchItemName: 'movie',
      },
      {
        id: 'horror',
        name: 'Horror',
        icon: '👻',
        searchItemName: 'horror movie',
        tmdbGenreId: 27,
      },
      {
        id: 'comedy',
        name: 'Comedy',
        icon: '😂',
        searchItemName: 'comedy movie',
        tmdbGenreId: 35,
      },
      {
        id: 'sci-fi',
        name: 'Sci-Fi',
        icon: '🚀',
        searchItemName: 'science fiction movie',
        tmdbGenreId: 878,
      },
    ],
  },
  {
    id: 'books',
    name: 'Books',
    icon: '📚',
    topics: [
      {
        id: 'general',
        name: 'General',
        icon: '📚',
        searchItemName: 'book',
      },
      {
        id: 'fantasy',
        name: 'Fantasy',
        icon: '🐉',
        searchItemName: 'fantasy book',
      },
      {
        id: 'mystery',
        name: 'Mystery',
        icon: '🔎',
        searchItemName: 'mystery book',
      },
      {
        id: 'sci-fi',
        name: 'Sci-Fi',
        icon: '🛸',
        searchItemName: 'science fiction book',
      },
      {
        id: 'biography',
        name: 'Biography',
        icon: '👤',
        searchItemName: 'biography',
      },
    ],
  },
];