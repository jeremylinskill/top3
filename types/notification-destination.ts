import { TOP3_CATEGORIES, type CategoryId, type Top3Topic } from '@/constants/top3-categories';
import type {
  CollectionOption,
  CollectionOptionKind,
} from '@/types/collection-option';

export type NotificationDestination =
  | {
      categoryId: CategoryId;
      kind: 'overall';
    }
  | {
      categoryId: CategoryId;
      kind: CollectionOptionKind;
      optionId: string;
    }
  | {
      categoryId: CategoryId;
      kind: 'genre';
      optionId: string; // TOP3_CATEGORIES topic ID, not collection_options ID
    };

export function destinationFromCollectionOption(
  option: CollectionOption
): NotificationDestination {
  return {
    categoryId: option.categoryId,
    kind: option.kind,
    optionId: option.id,
  };
}

export function resolveDestinationGenre(
  destination: NotificationDestination
): Top3Topic | null {
  if (destination.kind !== 'genre') return null;
  const category = TOP3_CATEGORIES.find(item => item.id === destination.categoryId);
  return category?.topics.find(topic =>
    topic.id !== 'general' && topic.id === destination.optionId
  ) ?? null;
}

export function resolveDestinationOption(
  destination: NotificationDestination,
  options: readonly CollectionOption[]
): CollectionOption | null {
  if (destination.kind === 'overall' || destination.kind === 'genre') {
    return null;
  }

  return (
    options.find(
      (option) =>
        option.active &&
        option.id === destination.optionId &&
        option.categoryId === destination.categoryId &&
        option.kind === destination.kind
    ) ?? null
  );
}
