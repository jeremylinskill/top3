import { trackAnalyticsEvent } from '@/lib/analytics';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';

type SharePublishedCollectionInput = {
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

export async function sharePublishedCollection({
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
      trackAnalyticsEvent('collection_shared', {
        source,
      });
    }
  } catch (error) {
    console.error(
      'Failed to share published collection:',
      error
    );
  }
}

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