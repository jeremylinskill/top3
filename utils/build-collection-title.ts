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
    return `Top 3 All ${category.name}`;
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
    return `Top 3 All ${category.name}`;
  }

  return `${baseTitle} • ${topic.name}`;
}

export function formatCollectionDisplayTitle(
  title: string
): string {
  const displayTitle = title.replace(
    /^Top 3\s+/i,
    ''
  );

  if (/^Actors$/i.test(displayTitle)) {
    return 'All Actors';
  }

  if (/^Directors$/i.test(displayTitle)) {
    return 'All Directors';
  }

  return displayTitle;
}

export function buildEntityCollectionTitle(
  name: string
): string {
  const prefix =
    /^(Actors|Directors)$/i.test(name.trim())
      ? 'All '
      : '';

  return `Top 3 ${prefix}${name}`;
}
