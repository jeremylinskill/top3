export type Top3Topic = {
  id: string;
  name: string;
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
      { id: 'general', name: 'General' },
      { id: 'horror', name: 'Horror' },
      { id: 'comedy', name: 'Comedy' },
      { id: 'sci-fi', name: 'Sci-Fi' },
    ],
  },
];