import { MINIMUM_TASTE_MATCH } from '@/constants/taste-match';
import { getMockUserById } from '@/services/post-service';
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
  currentUserId: string;
  limit?: number;
};

type GetTasteRecommendationForUserOptions = {
  posts: Post[];
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

export function getTasteRecommendations({
  posts,
  currentUserId,
  limit = 5,
}: GetTasteRecommendationsOptions): TasteRecommendation[] {
  if (!currentUserId || limit <= 0) {
    return [];
  }

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

      const user = getMockUserById(authorId);

      if (!user) {
        return;
      }

      const match = calculateTasteMatch(
        currentUserPosts,
        otherUserPosts
      );

    if (match.score < MINIMUM_TASTE_MATCH) {
  return;
}

      recommendations.push(
        createRecommendation(user, match)
      );
    }
  );

  return recommendations
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      if (
        second.sharedItems.length !==
        first.sharedItems.length
      ) {
        return (
          second.sharedItems.length -
          first.sharedItems.length
        );
      }

      if (
        second.matchingNumberOneItems
          .length !==
        first.matchingNumberOneItems.length
      ) {
        return (
          second.matchingNumberOneItems
            .length -
          first.matchingNumberOneItems
            .length
        );
      }

      return first.user.displayName.localeCompare(
        second.user.displayName
      );
    })
    .slice(0, limit);
}

export function getTasteRecommendationForUser({
  posts,
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

  const user = getMockUserById(otherUserId);

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

 if (match.score < MINIMUM_TASTE_MATCH) {
  return null;
}

  return createRecommendation(
    user,
    match
  );
}