import type { CategoryId } from '@/constants/top3-categories';
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

export function resolveDestinationOption(
  destination: NotificationDestination,
  options: readonly CollectionOption[]
): CollectionOption | null {
  if (destination.kind === 'overall') {
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
