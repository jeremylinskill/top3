import { Top3Item } from './top3-item';

export type Top3List = {
  id: string;

  category: string;

  topic?: string;

  title: string;

  items: [
    Top3Item | null,
    Top3Item | null,
    Top3Item | null,
  ];

  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
};