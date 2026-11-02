import { getTasteRecommendations } from '@/services/taste-recommendation-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';

export type SimilarTastePerson = ReturnType<typeof getTasteRecommendations>[number];

type SimilarTasteInput = {
  posts: Post[];
  profilesByUserId: Record<string, UserProfile>;
  currentUserId: string;
  followedUserIds: string[];
  blockedUserIds: string[];
};

// Both Discover and its See all screen must use one identical ranking.
// Candidate limit is set BEFORE eligibility filtering: a small limit
// would hide matches if top-ranked members were already followed/blocked.
export function getEligibleTasteRecommendations({
  posts,
  profilesByUserId,
  currentUserId,
  followedUserIds,
  blockedUserIds,
}: SimilarTasteInput): SimilarTastePerson[] {
  const publishedCountByUserId = new Map<string, number>();
  posts.forEach((post) => {
    publishedCountByUserId.set(
      post.authorId,
      (publishedCountByUserId.get(post.authorId) ?? 0) + 1
    );
  });

  const excludedUserIds = new Set([
    currentUserId,
    ...followedUserIds,
    ...blockedUserIds,
  ]);

  return getTasteRecommendations({
    posts,
    profilesByUserId,
    currentUserId,
    limit: Math.max(5, Object.keys(profilesByUserId).length),
  })
    .filter(({ user }) => !excludedUserIds.has(user.id))
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      if (second.sharedPickCount !== first.sharedPickCount) {
        return second.sharedPickCount - first.sharedPickCount;
      }
      const secondCount = publishedCountByUserId.get(second.user.id) ?? 0;
      const firstCount = publishedCountByUserId.get(first.user.id) ?? 0;
      if (secondCount !== firstCount) return secondCount - firstCount;
      return first.user.displayName.localeCompare(second.user.displayName);
    });
}
