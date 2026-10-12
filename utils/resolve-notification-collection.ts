import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import type { CollectionOption } from '@/types/collection-option';
import {
  NotificationDestination,
  resolveDestinationOption,
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
  options: readonly CollectionOption[]
): NotificationCollectionInput | null {
  const category = TOP3_CATEGORIES.find(
    (item) =>
      item.id === destination.categoryId &&
      item.id !== 'podcasts'
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
    title: `Top 3 ${option.name}`,
  };
}
