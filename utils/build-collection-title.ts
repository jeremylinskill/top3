import {
    TOP3_CATEGORIES,
} from '@/constants/top3-categories';

export function buildCollectionTitle(
  categoryId: string,
  topicId?: string
): string {
  const category =
    TOP3_CATEGORIES.find(
      (item) =>
        item.id === categoryId
    );

  if (!category) {
    return '';
  }

  if (!topicId) {
    return `Top 3 ${category.name}`;
  }

  const topic =
    category.topics.find(
      (item) =>
        item.id === topicId
    );

  if (
    !topic ||
    topic.id === 'general'
  ) {
    return `Top 3 ${category.name}`;
  }

  return `Top 3 ${category.name} • ${topic.name}`;
}