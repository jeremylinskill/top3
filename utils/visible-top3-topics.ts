import type { Top3Topic } from '@/constants/top3-categories';

/** Hide retired choices in new selection interfaces; keep old IDs valid for saved data. */
export function isVisibleTop3Genre(topic: Top3Topic, categoryId: string): boolean {
  return topic.id !== 'general' &&
    !(categoryId === 'books' && topic.id === 'graphic-novel');
}
