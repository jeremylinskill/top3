/**
 * Pure request-notification copy shared by the Expo app and the Supabase
 * push Edge Function. No React Native, Deno or network dependencies.
 *
 * The request's topic_label was validated and saved when it was sent.
 * Preserve that request-time wording across lock-screen and in-app surfaces.
 */
export type Top3RequestCopyDetails = {
  categoryId: string;
  destinationKind: 'overall' | 'type' | 'theme' | 'genre';
  topicLabel: string | null;
};

const CATEGORY_NAMES: Readonly<Record<string, string>> = {
  movies: 'Movies',
  tv: 'TV Shows',
  books: 'Books',
  games: 'Video Games',
  albums: 'Albums',
  artists: 'Artists',
  songs: 'Songs',
  podcasts: 'Podcasts',
};

export function getTop3RequestNotificationTitle(
  details: Top3RequestCopyDetails | null | undefined
): string | null {
  if (!details) return null;
  const topic = details.topicLabel?.trim();
  const category = CATEGORY_NAMES[details.categoryId];
  if (!topic || !category) return null;

  switch (details.destinationKind) {
    case 'overall':
      return `Top 3 ${category}`;
    case 'genre':
      return `Top 3 ${category} • ${topic}`;
    case 'type':
      return `Top 3 ${/^(Actors|Directors)$/i.test(topic) ? 'All ' : ''}${topic}`;
    case 'theme':
      return `Top 3 ${topic}`;
    default:
      return null;
  }
}

const FALLBACK = 'sent you a Top 3 request. Tap to respond.';

export type Top3RequestMessageParts = {
  beforeTitle: string;
  title: string | null;
  afterTitle: string;
  message: string;
};

export function getTop3RequestMessageParts(
  requestTitle: string | null | undefined
): Top3RequestMessageParts {
  const title = requestTitle?.trim() || null;
  if (!title) {
    return { beforeTitle: FALLBACK, title: null, afterTitle: '', message: FALLBACK };
  }
  const beforeTitle = 'wants to know your ';
  const afterTitle = '. Tap to create yours.';
  return {
    beforeTitle,
    title,
    afterTitle,
    message: `${beforeTitle}${title}${afterTitle}`,
  };
}

export function getTop3RequestPushBody(
  actorName: string,
  title: string | null | undefined
): string {
  return `${actorName.trim() || 'Someone'} ${getTop3RequestMessageParts(title).message}`;
}
