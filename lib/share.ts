import { trackAnalyticsEvent } from '@/lib/analytics';
import { DM_NAV_ENABLED } from '@/lib/dm-availability';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';

export type SharePublishedCollectionInput = {
  postId: string;
  title: string;
  source?: string;
};

type ShareOverallCollectionInput = {
  category: string;
  topic?: string;
  title: string;
  source?: string;
};

export function createPublishedCollectionUrl(
  postId: string
): string {
  return Linking.createURL('/published-top3', {
    queryParams: {
      postId,
    },
  });
}

export function createOverallCollectionUrl({
  category,
  topic,
}: Omit<
  ShareOverallCollectionInput,
  'title' | 'source'
>): string {
  return Linking.createURL('/category-feed', {
    queryParams: {
      category,
      topic: topic?.trim() || 'general',
      view: 'overall',
    },
  });
}

// Production uses the native share sheet until explicit DM release opt-in.
export function getInAppShareCollectionId(postId: string): string | null {
  if (!DM_NAV_ENABLED || !postId.startsWith('post-')) {
    return null;
  }
  return postId.slice('post-'.length) || null;
}

// The native system share sheet is retained for external sharing.
// The choice between sending inside/outside Top 3 belongs to the UI hook.
export async function sharePublishedCollectionOutside({
  postId,
  title,
  source,
}: SharePublishedCollectionInput): Promise<void> {
  const url = createPublishedCollectionUrl(postId);
  try {
    const result = await Share.share({
      title,
      message: `${title}\n${url}`,
      url,
    });
    if (result.action === Share.sharedAction) {
      trackAnalyticsEvent('collection_shared', { source });
    }
  } catch (error) {
    console.error('Failed to share published collection:', error);
  }
}

// Preserve the exported function for any call sites outside the four
// currently audited share entry points; they still share externally.
export const sharePublishedCollection = sharePublishedCollectionOutside;

export async function shareOverallCollection({
  category,
  topic,
  title,
  source,
}: ShareOverallCollectionInput): Promise<void> {
  const url = createOverallCollectionUrl({
    category,
    topic,
  });

  try {
    const result = await Share.share({
      title,
      message: `${title}\n${url}`,
      url,
    });

    if (result.action === Share.sharedAction) {
      trackAnalyticsEvent('collection_shared', {
        source,
      });
    }
  } catch (error) {
    console.error(
      'Failed to share overall collection:',
      error
    );
  }
}