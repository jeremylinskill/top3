import {
  getTasteRecommendations,
  TasteRecommendation,
} from '@/services/taste-recommendation-service';
import { Post } from '@/types/post';

export type PersonalizedFeedPost = {
  post: Post;
  isSuggested: boolean;
  suggestionReason?: string;
  sharedItemTitles?: string[];
};

type BuildPersonalizedFeedOptions = {
  posts: Post[];
  profilesByUserId: Record<
    string,
    TasteRecommendation['user']
  >;
  currentUserId: string;
  followedUserIds: string[];
};

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function getPublishedTime(post: Post) {
  return new Date(post.publishedAt).getTime();
}

function sortPostsByNewest(
  first: Post,
  second: Post
) {
  return (
    getPublishedTime(second) -
    getPublishedTime(first)
  );
}

function getSharedItemsForPost(
  post: Post,
  recommendation: TasteRecommendation
) {
  const sharedItemNames = new Set(
    recommendation.sharedItems.map(
      normalizeValue
    )
  );

  return post.collection.items
    .filter(Boolean)
    .map((item) => item?.title.trim() ?? '')
    .filter(Boolean)
    .filter((title) =>
      sharedItemNames.has(
        normalizeValue(title)
      )
    );
}

function getSuggestedPostForRecommendation(
  posts: Post[],
  recommendation: TasteRecommendation
) {
  const eligiblePosts = posts
    .filter(
      (post) =>
        post.authorId ===
        recommendation.user.id
    )
    .map((post) => ({
      post,
      sharedItems: getSharedItemsForPost(
        post,
        recommendation
      ),
    }))
    .filter(
      ({ sharedItems }) =>
        sharedItems.length > 0
    )
    .sort((first, second) => {
      /*
       * Prefer the card with more concrete shared
       * ranked picks.
       */
      if (
        second.sharedItems.length !==
        first.sharedItems.length
      ) {
        return (
          second.sharedItems.length -
          first.sharedItems.length
        );
      }

      /*
       * When two cards contain the same number of
       * shared picks, show the newest card.
       */
      return sortPostsByNewest(
        first.post,
        second.post
      );
    });

  return eligiblePosts[0];
}

function getSuggestionReason(
  sharedItems: string[]
) {
  if (sharedItems.length === 1) {
    return `You both ranked ${sharedItems[0]}`;
  }

  if (sharedItems.length === 2) {
    return (
      `You both ranked ${sharedItems[0]} ` +
      `and ${sharedItems[1]}`
    );
  }

  if (sharedItems.length > 2) {
    return (
      `You share ${sharedItems.length} ` +
      'ranked picks in this Top 3'
    );
  }

  return 'Recommended for you';
}

export function buildPersonalizedFeed({
  posts,
  profilesByUserId,
  currentUserId,
  followedUserIds,
}: BuildPersonalizedFeedOptions): PersonalizedFeedPost[] {
  const followedIds = new Set(
    followedUserIds
      .map((userId) => userId.trim())
      .filter(Boolean)
  );

  /*
   * Your own posts and posts from followed users
   * form the main chronological feed.
   */
  const priorityPosts = posts
    .filter(
      (post) =>
        post.authorId === currentUserId ||
        followedIds.has(post.authorId)
    )
    .sort(sortPostsByNewest);

  /*
   * The Taste Match service is the single source
   * of truth for recommendation eligibility.
   */
  const recommendations =
  getTasteRecommendations({
    posts,
    profilesByUserId,
    currentUserId,
    excludedUserIds: followedUserIds,
    limit: posts.length,
  });

  /*
   * Show at most one recommended card per person.
   *
   * The selected card must itself contain at
   * least one item shared with the current user.
   */
  const suggestionPosts =
    recommendations.reduce<
      PersonalizedFeedPost[]
    >((suggestions, recommendation) => {
      const suggestedPost =
        getSuggestedPostForRecommendation(
          posts,
          recommendation
        );

      if (!suggestedPost) {
        return suggestions;
      }

      suggestions.push({
        post: suggestedPost.post,
        isSuggested: true,
        suggestionReason:
          getSuggestionReason(
            suggestedPost.sharedItems
          ),
        sharedItemTitles:
          suggestedPost.sharedItems,
      });

      return suggestions;
    }, []);

  const result: PersonalizedFeedPost[] =
    [];

  let priorityIndex = 0;
  let suggestionIndex = 0;

  /*
   * Insert one recommendation after every three
   * priority posts.
   */
  while (
    priorityIndex < priorityPosts.length ||
    suggestionIndex < suggestionPosts.length
  ) {
    for (
      let count = 0;
      count < 3 &&
      priorityIndex < priorityPosts.length;
      count += 1
    ) {
      result.push({
        post: priorityPosts[priorityIndex],
        isSuggested: false,
      });

      priorityIndex += 1;
    }

    if (
      suggestionIndex <
      suggestionPosts.length
    ) {
      result.push(
        suggestionPosts[suggestionIndex]
      );

      suggestionIndex += 1;
    }

    /*
     * If no priority posts remain, append the
     * remaining recommendations in Taste Match
     * order.
     */
    if (
      priorityIndex >= priorityPosts.length
    ) {
      while (
        suggestionIndex <
        suggestionPosts.length
      ) {
        result.push(
          suggestionPosts[suggestionIndex]
        );

        suggestionIndex += 1;
      }
    }
  }

  return result;
}