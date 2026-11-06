import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import type { CollectionOption } from '@/types/collection-option';
import { getCollectionOptionListTitle } from '@/utils/collection-option-list-title';
import {
  NotificationDestination,
  resolveDestinationOption,
  resolveDestinationGenre,
} from '@/types/notification-destination';
import {
  buildCollectionTitle,
  buildEntityCollectionTitle,
} from '@/utils/build-collection-title';

export type NotificationCollectionInput = {
  category: CategoryId;
  type?: string;
  topic?: string;
  themeId?: string;
  collectionOptionId?: string;
  title: string;
};

export function resolveNotificationCollection(
  destination: NotificationDestination,
  options: readonly CollectionOption[],
  { includePodcasts = false }: { includePodcasts?: boolean } = {}
): NotificationCollectionInput | null {
  const category = TOP3_CATEGORIES.find(
    (item) =>
      item.id === destination.categoryId &&
      (includePodcasts || item.id !== 'podcasts')
  );

  if (!category) {
    return null;
  }

  if (destination.kind === 'overall') {
    return {
      category: category.id,
      title: buildCollectionTitle(category.id),
    };
  }

  if (destination.kind === 'genre') {
    const genre = resolveDestinationGenre(destination);
    if (!genre) return null;
    return {
      category: category.id,
      topic: genre.name,
      title: buildCollectionTitle(category.id, genre.id),
    };
  }

  const option = resolveDestinationOption(
    destination,
    options
  );

  if (!option) {
    return null;
  }

  if (destination.kind === 'type') {
    return {
      category: category.id,
      type: option.name,
      collectionOptionId: option.id,
      title: buildEntityCollectionTitle(option.name),
    };
  }

  return {
    category: category.id,
    topic: option.name,
    themeId: option.slug,
    collectionOptionId: option.id,
    title: getCollectionOptionListTitle(option),
  };
}
