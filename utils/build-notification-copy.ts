import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import type { CollectionOption } from '@/types/collection-option';
import {
  NotificationDestination,
  resolveDestinationOption,
  resolveDestinationGenre,
} from '@/types/notification-destination';

export type SuggestedNotificationCopy = {
  title: string;
  message: string;
};

const PLURAL_NOUN_ENDING =
  /\b(Albums|Artists|Books|Games|Movies|Songs|Shows|Guitarists|Drummers|Bassists|Vocalists)\s*$/i;

export function buildNotificationCopy(
  destination: NotificationDestination,
  options: readonly CollectionOption[]
): SuggestedNotificationCopy | null {
  const category = TOP3_CATEGORIES.find(
    (item) => item.id === destination.categoryId
  );

  if (!category) {
    return null;
  }

  if (destination.kind === 'overall') {
    const subject =
      category.id === 'tv'
        ? 'TV shows'
        : category.name.toLowerCase();

    return {
      title: `What are your Top 3 ${subject}?`,
      message:
        `Rank your three favourite ${subject} ` +
        'and discover people who share your taste!',
    };
  }

  const option = destination.kind === 'genre'
    ? resolveDestinationGenre(destination)
    : resolveDestinationOption(destination, options);

  if (!option) {
    return null;
  }

  const name = option.name.trim();
  // Movie Themes (and other collection options) can define a reader-facing
  // full list title such as "Top 3 Monster Movies" even when the admin name is
  // just "Monsters". Use that canonical title for suggested notification copy.
  const configuredTitle =
    'providerConfig' in option &&
    typeof option.providerConfig?.displayTitle === 'string'
      ? option.providerConfig.displayTitle.trim()
      : '';
  const configuredSubject =
    /^Top\s*3\s+(.+)$/i.exec(configuredTitle)?.[1]?.trim() ?? '';
  const hasPluralEnding =
    PLURAL_NOUN_ENDING.test(name);

  const subject = hasPluralEnding
    ? name.replace(
        PLURAL_NOUN_ENDING,
        (ending) => ending.toLowerCase()
      )
    : name;

  const suggestedTitle = configuredSubject
    ? `What's your Top 3 ${configuredSubject}?`
    : hasPluralEnding
      ? `What are your Top 3 ${subject}?`
      : `${name}: What's your Top 3?`;

  const suggestedMessage = configuredSubject
    ? `Pick your Top 3 ${configuredSubject} and see who shares your taste!`
    : hasPluralEnding
      ? `Rank your three favourite ${subject} and see who shares your taste!`
      : `Make your Top 3 picks for ${name} and see who shares your taste!`;

  return {
    title:
      suggestedTitle.length <= 100
        ? suggestedTitle
        : "What's your Top 3?",
    message:
      suggestedMessage.length <= 220
        ? suggestedMessage
        : 'Share your favourites and discover people who share your taste!',
  };
}
