import { Ionicons } from '@expo/vector-icons';

export type CategoryId =
  | 'movies'
  | 'books'
  | 'tv'
  | 'games';

export type Top3Topic = {
  id: string;
  name: string;
  icon: string;
  searchItemName: string;
  tmdbGenreId?: number;
rawgGenreId?: number;
};

export type Top3Category = {
  id: CategoryId;
  name: string;
  icon: string;
  placeholderIcon: keyof typeof Ionicons.glyphMap;
  topics: Top3Topic[];
};

export const TOP3_CATEGORIES: Top3Category[] = [
  {
    id: 'movies',
    name: 'Movies',
    icon: '🎬',
    placeholderIcon: 'film-outline',
    topics: [
      {
        id: 'general',
        name: 'General',
        icon: '🎬',
        searchItemName: 'movie',
      },
      {
        id: 'action',
        name: 'Action',
        icon: '💥',
        searchItemName: 'action movie',
        tmdbGenreId: 28,
      },
      {
        id: 'adventure',
        name: 'Adventure',
        icon: '🗺️',
        searchItemName: 'adventure movie',
        tmdbGenreId: 12,
      },
      {
        id: 'comedy',
        name: 'Comedy',
        icon: '😂',
        searchItemName: 'comedy movie',
        tmdbGenreId: 35,
      },
      {
        id: 'drama',
        name: 'Drama',
        icon: '🎭',
        searchItemName: 'drama movie',
        tmdbGenreId: 18,
      },
      {
        id: 'fantasy',
        name: 'Fantasy',
        icon: '🐉',
        searchItemName: 'fantasy movie',
        tmdbGenreId: 14,
      },
      {
        id: 'horror',
        name: 'Horror',
        icon: '👻',
        searchItemName: 'horror movie',
        tmdbGenreId: 27,
      },
      {
        id: 'romance',
        name: 'Romance',
        icon: '❤️',
        searchItemName: 'romance movie',
        tmdbGenreId: 10749,
      },
      {
        id: 'sci-fi',
        name: 'Sci-Fi',
        icon: '🚀',
        searchItemName: 'science fiction movie',
        tmdbGenreId: 878,
      },
      {
        id: 'thriller',
        name: 'Thriller',
        icon: '😰',
        searchItemName: 'thriller movie',
        tmdbGenreId: 53,
      },
    ],
  },
  {
    id: 'books',
    name: 'Books',
    icon: '📚',
    placeholderIcon: 'book-outline',
    topics: [
      {
        id: 'general',
        name: 'General',
        icon: '📚',
        searchItemName: 'book',
      },
      {
        id: 'biography',
        name: 'Biography',
        icon: '👤',
        searchItemName: 'biography',
      },
      {
        id: 'business',
        name: 'Business',
        icon: '💼',
        searchItemName: 'business book',
      },
      {
        id: 'childrens',
        name: "Children's",
        icon: '🧸',
        searchItemName: "children's book",
      },
      {
        id: 'fantasy',
        name: 'Fantasy',
        icon: '🐉',
        searchItemName: 'fantasy book',
      },
      {
        id: 'fiction',
        name: 'Fiction',
        icon: '📖',
        searchItemName: 'fiction book',
      },
      {
        id: 'history',
        name: 'History',
        icon: '🏛️',
        searchItemName: 'history book',
      },
      {
        id: 'mystery',
        name: 'Mystery',
        icon: '🔎',
        searchItemName: 'mystery book',
      },
      {
        id: 'non-fiction',
        name: 'Non-Fiction',
        icon: '🧠',
        searchItemName: 'non-fiction book',
      },
      {
        id: 'romance',
        name: 'Romance',
        icon: '❤️',
        searchItemName: 'romance book',
      },
      {
        id: 'sci-fi',
        name: 'Sci-Fi',
        icon: '🛸',
        searchItemName: 'science fiction book',
      },
      {
        id: 'self-help',
        name: 'Self-Help',
        icon: '🌱',
        searchItemName: 'self-help book',
      },
    ],
  },
  {
    id: 'tv',
    name: 'TV Shows',
    icon: '📺',
    placeholderIcon: 'tv-outline',
    topics: [
      {
        id: 'general',
        name: 'General',
        icon: '📺',
        searchItemName: 'TV show',
      },
      {
        id: 'comedy',
        name: 'Comedy',
        icon: '😂',
        searchItemName: 'comedy TV show',
        tmdbGenreId: 35,
      },
      {
        id: 'crime',
        name: 'Crime',
        icon: '🕵️',
        searchItemName: 'crime TV show',
        tmdbGenreId: 80,
      },
      {
        id: 'documentary',
        name: 'Documentary',
        icon: '🎥',
        searchItemName: 'documentary TV show',
        tmdbGenreId: 99,
      },
      {
        id: 'drama',
        name: 'Drama',
        icon: '🎭',
        searchItemName: 'drama TV show',
        tmdbGenreId: 18,
      },
      {
        id: 'fantasy',
        name: 'Fantasy',
        icon: '🐉',
        searchItemName: 'fantasy TV show',
        tmdbGenreId: 10765,
      },
      {
        id: 'reality',
        name: 'Reality',
        icon: '🌟',
        searchItemName: 'reality TV show',
        tmdbGenreId: 10764,
      },
      {
        id: 'sci-fi',
        name: 'Sci-Fi',
        icon: '🚀',
        searchItemName: 'science fiction TV show',
        tmdbGenreId: 10765,
      },
      {
        id: 'animated',
        name: 'Animated',
        icon: '🖍️',
        searchItemName: 'animated TV show',
        tmdbGenreId: 16,
      },
    ],
  },
  {
  id: 'games',
  name: 'Video Games',
  icon: '🎮',
  placeholderIcon: 'game-controller-outline',
  topics: [
    {
      id: 'general',
      name: 'General',
      icon: '🎮',
      searchItemName: 'video game',
    },
    {
      id: 'action',
      name: 'Action',
      icon: '⚔️',
      searchItemName: 'action game',
      rawgGenreId: 4,
    },
    {
      id: 'adventure',
      name: 'Adventure',
      icon: '🗺️',
      searchItemName: 'adventure game',
      rawgGenreId: 3,
    },
    {
      id: 'rpg',
      name: 'RPG',
      icon: '🧙',
      searchItemName: 'role-playing game',
      rawgGenreId: 5,
    },
    {
      id: 'shooter',
      name: 'Shooter',
      icon: '🔫',
      searchItemName: 'shooter game',
      rawgGenreId: 2,
    },
    {
      id: 'strategy',
      name: 'Strategy',
      icon: '♟️',
      searchItemName: 'strategy game',
      rawgGenreId: 10,
    },
    {
      id: 'simulation',
      name: 'Simulation',
      icon: '🏗️',
      searchItemName: 'simulation game',
      rawgGenreId: 14,
    },
    {
      id: 'racing',
      name: 'Racing',
      icon: '🏎️',
      searchItemName: 'racing game',
      rawgGenreId: 1,
    },
    {
      id: 'sports',
      name: 'Sports',
      icon: '⚽',
      searchItemName: 'sports game',
      rawgGenreId: 15,
    },
    {
      id: 'puzzle',
      name: 'Puzzle',
      icon: '🧩',
      searchItemName: 'puzzle game',
      rawgGenreId: 7,
    },
  ],
},
];