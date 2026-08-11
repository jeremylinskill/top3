import {
    TOP3_CATEGORIES,
} from '@/constants/top3-categories';

export function buildCollectionTitle(
  categoryId: string,
  typeOrTopicId?: string,
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

  const baseTitle =
    `Top 3 ${category.name}`;

  if (!typeOrTopicId) {
    return baseTitle;
  }

  const type =
    category.types?.find(
      (item) =>
        item.id === typeOrTopicId
    );

  if (type) {
    if (!topicId) {
      return `${baseTitle} • ${type.name}`;
    }

    const topic =
      type.topics.find(
        (item) =>
          item.id === topicId
      );

    if (
      !topic ||
      topic.id === 'general'
    ) {
      return `${baseTitle} • ${type.name}`;
    }

    return `${baseTitle} • ${type.name} • ${topic.name}`;
  }

  const topic =
    category.topics.find(
      (item) =>
        item.id === typeOrTopicId
    );

  if (
    !topic ||
    topic.id === 'general'
  ) {
    return baseTitle;
  }

  return `${baseTitle} • ${topic.name}`;
}