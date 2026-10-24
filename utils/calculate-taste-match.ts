import { Post } from '@/types/post';

export type SharedRankComparison = {
  category: string;
  topic?: string;
  type?: string;
  collectionTitle?: string;

  currentUserItems: string[];
  otherUserItems: string[];

  sharedItems: string[];
};

export type TasteMatchResult = {
  score: number;

  sharedCategories: string[];
  sharedTopics: string[];
  sharedItems: string[];

  matchingNumberOneItems: string[];

  sharedRankComparisons: SharedRankComparison[];

  reason: string;
};

const RANK_WEIGHTS = [3, 2, 1] as const;

const SAME_RANK_MULTIPLIER = 1;
const ONE_POSITION_APART_MULTIPLIER = 0.6;
const TWO_POSITIONS_APART_MULTIPLIER = 0.35;

const RANK_SIMILARITY_WEIGHT = 0.55;
const SHARED_PICK_DEPTH_WEIGHT = 0.25;
const COLLECTION_BREADTH_WEIGHT = 0.2;

const BREADTH_EVIDENCE_BONUS_PER_EXTRA_COLLECTION =
  0.03;

const MAX_BREADTH_EVIDENCE_BONUS = 0.06;

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function getPostKey(post: Post) {
  // Do not compare Actors, Directors or other typed lists with
  // an overall list merely because both use the Movies category.
  // Theme IDs keep themes separate from regular genre lists.
  // Normalize legacy records without their optional identity fields.
  return JSON.stringify([
    normalize(post.collection.category),
    normalize(post.collection.type) || 'general',
    normalize(post.collection.topic) || 'general',
    normalize(post.collection.themeId) || 'no-theme',
  ]);
}

function getItemTitles(post: Post) {
  return post.collection.items
    .filter(Boolean)
    .map((item) => item?.title.trim() ?? '')
    .filter(Boolean);
}

function getRankDistanceMultiplier(
  firstRankIndex: number,
  secondRankIndex: number
) {
  const distance = Math.abs(
    firstRankIndex - secondRankIndex
  );

  if (distance === 0) {
    return SAME_RANK_MULTIPLIER;
  }

  if (distance === 1) {
    return ONE_POSITION_APART_MULTIPLIER;
  }

  return TWO_POSITIONS_APART_MULTIPLIER;
}

function calculateComparisonScore(
  comparison: SharedRankComparison
) {
  const currentItems =
    comparison.currentUserItems.map(normalize);

  const otherItems =
    comparison.otherUserItems.map(normalize);

  const maximumScore = RANK_WEIGHTS.reduce(
    (total, weight) => total + weight,
    0
  );

  let earnedScore = 0;

  currentItems.forEach(
    (currentItem, currentRankIndex) => {
      const otherRankIndex =
        otherItems.indexOf(currentItem);

      if (otherRankIndex < 0) {
        return;
      }

      const currentRankWeight =
        RANK_WEIGHTS[currentRankIndex] ?? 0;

      const otherRankWeight =
        RANK_WEIGHTS[otherRankIndex] ?? 0;

      const averageRankWeight =
        (currentRankWeight +
          otherRankWeight) /
        2;

      const rankMultiplier =
        getRankDistanceMultiplier(
          currentRankIndex,
          otherRankIndex
        );

      earnedScore +=
        averageRankWeight * rankMultiplier;
    }
  );

  return {
    earnedScore,
    maximumScore,
  };
}

function calculateRankSimilarity(
  comparisons: SharedRankComparison[]
) {
  if (comparisons.length === 0) {
    return 0;
  }

  let totalEarnedScore = 0;
  let totalMaximumScore = 0;

  comparisons.forEach((comparison) => {
    const {
      earnedScore,
      maximumScore,
    } = calculateComparisonScore(
      comparison
    );

    totalEarnedScore += earnedScore;
    totalMaximumScore += maximumScore;
  });

  if (totalMaximumScore === 0) {
    return 0;
  }

  return Math.min(
    1,
    totalEarnedScore / totalMaximumScore
  );
}

function calculateSharedPickDepth(
  sharedPickCount: number
) {
  if (sharedPickCount <= 0) {
    return 0;
  }

  return Math.min(
    1,
    1 - Math.exp(-sharedPickCount / 3)
  );
}

function getMeaningfulComparisonCount(
  comparisons: SharedRankComparison[]
) {
  return comparisons.filter(
    (comparison) =>
      comparison.sharedItems.length > 0
  ).length;
}

function calculateCollectionBreadth(
  meaningfulComparisonCount: number
) {
  if (meaningfulComparisonCount <= 0) {
    return 0;
  }

  if (meaningfulComparisonCount === 1) {
    return 0.35;
  }

  if (meaningfulComparisonCount === 2) {
    return 0.6;
  }

  if (meaningfulComparisonCount === 3) {
    return 0.8;
  }

  if (meaningfulComparisonCount === 4) {
    return 0.92;
  }

  return 1;
}

function calculateBreadthEvidenceBonus(
  meaningfulComparisonCount: number
) {
  const extraCollections = Math.max(
    0,
    meaningfulComparisonCount - 1
  );

  return Math.min(
    MAX_BREADTH_EVIDENCE_BONUS,
    extraCollections *
      BREADTH_EVIDENCE_BONUS_PER_EXTRA_COLLECTION
  );
}

function calculateTasteMatchScore(
  comparisons: SharedRankComparison[],
  sharedPickCount: number
) {
  if (comparisons.length === 0) {
    return 0;
  }

  const rankSimilarity =
    calculateRankSimilarity(comparisons);

  const sharedPickDepth =
    calculateSharedPickDepth(
      sharedPickCount
    );

  const meaningfulComparisonCount =
    getMeaningfulComparisonCount(
      comparisons
    );

  const collectionBreadth =
    calculateCollectionBreadth(
      meaningfulComparisonCount
    );

  const breadthEvidenceBonus =
    calculateBreadthEvidenceBonus(
      meaningfulComparisonCount
    );

  const blendedScore =
    rankSimilarity *
      RANK_SIMILARITY_WEIGHT +
    sharedPickDepth *
      SHARED_PICK_DEPTH_WEIGHT +
    collectionBreadth *
      COLLECTION_BREADTH_WEIGHT +
    breadthEvidenceBonus;

  return Math.round(
    Math.min(1, blendedScore) * 100
  );
}

function buildSharedRankComparisons(
  currentUserPosts: Post[],
  otherUserPosts: Post[]
): SharedRankComparison[] {
  const currentPostsByKey = new Map<
    string,
    Post[]
  >();

  const otherPostsByKey = new Map<
    string,
    Post[]
  >();

  currentUserPosts.forEach((post) => {
    const key = getPostKey(post);

    const existingPosts =
      currentPostsByKey.get(key) ?? [];

    currentPostsByKey.set(key, [
      ...existingPosts,
      post,
    ]);
  });

  otherUserPosts.forEach((post) => {
    const key = getPostKey(post);

    const existingPosts =
      otherPostsByKey.get(key) ?? [];

    otherPostsByKey.set(key, [
      ...existingPosts,
      post,
    ]);
  });

  const comparisons: SharedRankComparison[] =
    [];

  currentPostsByKey.forEach(
    (currentPosts, key) => {
      const matchingOtherPosts =
        otherPostsByKey.get(key);

      if (!matchingOtherPosts) {
        return;
      }

      currentPosts.forEach((currentPost) => {
        matchingOtherPosts.forEach(
          (otherPost) => {
            // When both records have stable collection-option IDs,
            // never equate two different options even if their
            // display names happen to be identical.
            const currentOptionId = normalize(
              currentPost.collection.collectionOptionId
            );
            const otherOptionId = normalize(
              otherPost.collection.collectionOptionId
            );
            if (
              currentOptionId &&
              otherOptionId &&
              currentOptionId !== otherOptionId
            ) {
              return;
            }

            const currentUserItems =
              getItemTitles(currentPost);

            const otherUserItems =
              getItemTitles(otherPost);

            const currentNormalizedItems =
              currentUserItems.map(normalize);

            const otherNormalizedItems =
              otherUserItems.map(normalize);

            const sharedItemKeys = unique(
              currentNormalizedItems.filter(
                (item) =>
                  otherNormalizedItems.includes(
                    item
                  )
              )
            );

            const sharedItems =
              sharedItemKeys.map(
                (sharedItemKey) => {
                  const currentItemIndex =
                    currentNormalizedItems.indexOf(
                      sharedItemKey
                    );

                  const otherItemIndex =
                    otherNormalizedItems.indexOf(
                      sharedItemKey
                    );

                  return (
                    currentUserItems[
                      currentItemIndex
                    ] ??
                    otherUserItems[
                      otherItemIndex
                    ] ??
                    sharedItemKey
                  );
                }
              );

            comparisons.push({
              category:
                currentPost.collection.category,
              topic:
                currentPost.collection.topic,
              type:
                currentPost.collection.type,
              collectionTitle:
                currentPost.collection.title,
              currentUserItems,
              otherUserItems,
              sharedItems,
            });
          }
        );
      });
    }
  );

  return comparisons.sort(
    (first, second) => {
      if (
        second.sharedItems.length !==
        first.sharedItems.length
      ) {
        return (
          second.sharedItems.length -
          first.sharedItems.length
        );
      }

      const categoryComparison =
        first.category.localeCompare(
          second.category
        );

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return (
        first.topic ?? ''
      ).localeCompare(
        second.topic ?? ''
      );
    }
  );
}

function getMatchingNumberOneItems(
  comparisons: SharedRankComparison[]
) {
  const matchingItems: string[] = [];

  comparisons.forEach((comparison) => {
    const currentNumberOne =
      comparison.currentUserItems[0];

    const otherNumberOne =
      comparison.otherUserItems[0];

    if (
      currentNumberOne &&
      otherNumberOne &&
      normalize(currentNumberOne) ===
        normalize(otherNumberOne)
    ) {
      matchingItems.push(
        currentNumberOne
      );
    }
  });

  return unique(matchingItems);
}

function getSharedItems(
  comparisons: SharedRankComparison[]
) {
  // Score and explain only genuinely comparable lists; a name
  // occurring in an unrelated category/type is not shared taste.
  const seen = new Set<string>();
  const sharedItems: string[] = [];

  comparisons.forEach((comparison) => {
    comparison.sharedItems.forEach((title) => {
      const key = normalize(title);
      if (key && !seen.has(key)) {
        seen.add(key);
        sharedItems.push(title);
      }
    });
  });

  return sharedItems;
}

export function calculateTasteMatch(
  currentUserPosts: Post[],
  otherUserPosts: Post[]
): TasteMatchResult {
  const sharedRankComparisons =
    buildSharedRankComparisons(
      currentUserPosts,
      otherUserPosts
    );

  const sharedCategories = unique(
    sharedRankComparisons.map((comparison) =>
      normalize(comparison.category)
    )
  );

  const sharedTopics = unique(
    sharedRankComparisons
      .map((comparison) =>
        normalize(comparison.topic)
      )
      .filter(
        (topic) => Boolean(topic) && topic !== 'general'
      )
  );

  const sharedItems = getSharedItems(
    sharedRankComparisons
  );

  const matchingNumberOneItems =
    getMatchingNumberOneItems(
      sharedRankComparisons
    );

  const score = calculateTasteMatchScore(
    sharedRankComparisons,
    sharedItems.length
  );

  let reason =
    'You have similar taste.';

  if (matchingNumberOneItems.length) {
    reason =
      `You both ranked #1: ` +
      matchingNumberOneItems[0];
  } else if (sharedItems.length >= 2) {
    reason =
      `You both ranked ` +
      `${sharedItems[0]} and ` +
      sharedItems[1];
  } else if (sharedItems.length === 1) {
    reason =
      `You both ranked ` +
      sharedItems[0];
  } else if (sharedTopics.length) {
    reason =
      `You both love ` +
      sharedTopics[0];
  } else if (sharedCategories.length) {
    reason =
      `You both rank ` +
      sharedCategories[0];
  }

  return {
    score,

    sharedCategories,

    sharedTopics,

    sharedItems,

    matchingNumberOneItems,

    sharedRankComparisons,

    reason,
  };
}