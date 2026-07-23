import { Top3List } from './top3-list';

export type Post = {
  id: string;

  authorId: string;

  collection: Top3List;

  publishedAt: string;

  reactions: number;

  comments: number;
};