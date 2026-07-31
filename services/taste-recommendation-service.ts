import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import {
    calculateTasteMatch,
    SharedRankComparison,
    TasteMatchResult,
} from '@/utils/calculate-taste-match';

export type TasteRecommendation = {
  user: UserProfile;
  score: number;
  reason: string;

  sharedItems: string[];
  sharedCategories: string[];
  sharedTopics: string[];

  matchingNumberOneItems: string[];

  sharedRankComparisons: SharedRankComparison[];
};

type GetTasteRecommendationsOptions = {
  posts: Post[];
  profilesByUserId: Record<
    string,
    UserProfile
  >;
  currentUserId: string;
  excludedUserIds?: string[];
  limit?: number;
};

type GetTasteRecommendationForUserOptions = {
  posts: Post[];
  profilesByUserId: Record<
    string,
    UserProfile
  >;
  currentUserId: string;
  otherUserId: string;
};

function groupPostsByAuthor(
  posts: Post[]
) {
  const postsByAuthor = new Map<
    string,
    Post[]
  >();

  posts.forEach((post) => {
    const existingPosts =
      postsByAuthor.get(post.authorId) ?? [];

    postsByAuthor.set(post.authorId, [
      ...existingPosts,
      post,
    ]);
  });

  return postsByAuthor;
}

function createRecommendation(
  user: UserProfile,
  match: TasteMatchResult
): TasteRecommendation {
  return {
    user,
    score: match.score,
    reason: match.reason,

    sharedItems: match.sharedItems,
    sharedCategories:
      match.sharedCategories,
    sharedTopics: match.sharedTopics,

    matchingNumberOneItems:
      match.matchingNumberOneItems,

    sharedRankComparisons:
      match.sharedRankComparisons,
  };
}

function getMatchingCollectionCount(
  recommendation: TasteRecommendation
) {
  return recommendation.sharedRankComparisons.filter(
    (comparison) =>
      comparison.sharedItems.length > 0
  ).length;
}

export function getTasteRecommendations({
  posts,
  profilesByUserId,
  currentUserId,
  excludedUserIds = [],
  limit = 5,
}: GetTasteRecommendationsOptions): TasteRecommendation[] {
  if (!currentUserId || limit <= 0) {
    return [];
  }

  const excludedIds = new Set(
    excludedUserIds
      .map((userId) => userId.trim())
      .filter(Boolean)
  );

  const postsByAuthor =
    groupPostsByAuthor(posts);

  const currentUserPosts =
    postsByAuthor.get(currentUserId) ?? [];

  if (currentUserPosts.length === 0) {
    return [];
  }

  const recommendations: TasteRecommendation[] =
    [];

  postsByAuthor.forEach(
    (otherUserPosts, authorId) => {
      if (authorId === currentUserId) {
        return;
      }

      if (excludedIds.has(authorId)) {
        return;
      }

      const user = profilesByUserId[authorId];

if (!user) {
  return;
}

      /*
       * Only public profiles are eligible to
       * appear in recommendation lists.
       */
      if (user.visibility !== 'public') {
        return;
      }

      const match = calculateTasteMatch(
        currentUserPosts,
        otherUserPosts
      );

      /*
       * A recommendation must have at least one
       * concrete shared ranked pick.
       *
       * Taste Match score is used for ordering,
       * not as an eligibility threshold.
       */
      if (match.sharedItems.length === 0) {
        return;
      }

      recommendations.push(
        createRecommendation(user, match)
      );
    }
  );

  return recommendations
    .sort((first, second) => {
      /*
       * 1. Strongest overall Taste Match first.
       */
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      /*
       * 2. More shared ranked picks first.
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
       * 3. Matches spread across more collections
       *    rank ahead of isolated matches.
       */
      const secondMatchingCollectionCount =
        getMatchingCollectionCount(second);

      const firstMatchingCollectionCount =
        getMatchingCollectionCount(first);

      if (
        secondMatchingCollectionCount !==
        firstMatchingCollectionCount
      ) {
        return (
          secondMatchingCollectionCount -
          firstMatchingCollectionCount
        );
      }

      /*
       * 4. Identical #1 picks provide a final
       *    relevance tie-breaker.
       */
      if (
        second.matchingNumberOneItems.length !==
        first.matchingNumberOneItems.length
      ) {
        return (
          second.matchingNumberOneItems.length -
          first.matchingNumberOneItems.length
        );
      }

      /*
       * 5. Stable alphabetical fallback.
       */
      return first.user.displayName.localeCompare(
        second.user.displayName
      );
    })
    .slice(0, limit);
}

export function getTasteRecommendationForUser({
  posts,
  profilesByUserId,
  currentUserId,
  otherUserId,
}: GetTasteRecommendationForUserOptions): TasteRecommendation | null {
  if (
    !currentUserId ||
    !otherUserId ||
    currentUserId === otherUserId
  ) {
    return null;
  }

  const user = profilesByUserId[otherUserId];

  if (!user) {
    return null;
  }

  const currentUserPosts = posts.filter(
    (post) =>
      post.authorId === currentUserId
  );

  const otherUserPosts = posts.filter(
    (post) =>
      post.authorId === otherUserId
  );

  if (
    currentUserPosts.length === 0 ||
    otherUserPosts.length === 0
  ) {
    return null;
  }

  const match = calculateTasteMatch(
    currentUserPosts,
    otherUserPosts
  );

  /*
   * Direct Taste Match lookups are allowed for
   * any valid user, including private profiles.
   *
   * The public-profile and exclusion rules apply
   * only to recommendation lists.
   */
  if (match.sharedItems.length === 0) {
    return null;
  }

  return createRecommendation(
    user,
    match
  );
}