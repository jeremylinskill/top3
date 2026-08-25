import {
  init,
  reset,
  setUserId,
  track,
} from '@amplitude/analytics-react-native';

export type AnalyticsEvent =
  | 'account_created'
  | 'onboarding_completed'
  | 'collection_started'
  | 'collection_completed'
  | 'collection_published'
  | 'collection_edited'
  | 'search_performed'
  | 'item_added'
  | 'discover_viewed'
  | 'profile_viewed'
  | 'user_followed'
  | 'collection_liked'
  | 'comment_added'
  | 'taste_match_viewed'
  | 'collection_viewed'
  | 'collection_shared'
  | 'notification_opened';

export type AnalyticsEventProperties = {
  category?: string;
  source?: string;
  rank?: number;
  rankCount?: number;
};

let isInitialized = false;

export function initializeAnalytics() {
  if (isInitialized) {
    return;
  }

  const apiKey =
    process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY;

  if (!apiKey) {
    console.warn(
      'Amplitude analytics is not configured.'
    );

    return;
  }

  init(apiKey, undefined, {
    trackingOptions: {
      adid: false,
      carrier: false,
      deviceManufacturer: false,
      deviceModel: false,
      ipAddress: false,
      language: false,
      osName: false,
      osVersion: false,
      platform: false,
    },
  });

  isInitialized = true;
}

export function identifyAnalyticsUser(
  userId?: string
) {
  setUserId(userId);
}

export function resetAnalyticsUser() {
  if (!isInitialized) {
    initializeAnalytics();
  }

  if (!isInitialized) {
    return;
  }

  reset();
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEvent,
  properties?: AnalyticsEventProperties
) {
  if (!isInitialized) {
    initializeAnalytics();
  }

  if (!isInitialized) {
    return;
  }

  track(eventName, properties);
}