import { Post } from '@/types/post';
import { Top3Item } from '@/types/top3-item';

export type CommunityTop3Result = {
  category: string;
  topic: string;
  title: string;
  totalLists: number;
  items: CommunityTop3Item[];
};

export type CommunityTop3Item = {
  item: Top3Item;
  score: number;
  firstPlaceCount: number;
  appearanceCount: number;
};

type CalculateCommunityTop3Options = {
  category: string;
  topic?: string;
  limit?: number;
};

type AggregatedItem = {
  item: Top3Item;
  score: number;
  firstPlaceCount: number;
  appearanceCount: number;
};

const RANK_POINTS = [3, 2, 1] as const;

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeTopic(topic?: string) {
  return normalizeValue(topic) || 'general';
}

function createResultTitle(
  category: string,
  topic: string
) {
  if (topic === 'general') {
    return `Community Top 3 ${category}`;
  }

  return `Community Top 3: ${topic}`;
}

export function calculateCommunityTop3(
  posts: Post[],
  options: CalculateCommunityTop3Options
): CommunityTop3Result {
  const normalizedCategory = normalizeValue(
    options.category
  );

  const normalizedTopic = normalizeTopic(
    options.topic
  );

  const limit = Math.max(
    1,
    options.limit ?? 3
  );

  const matchingPosts = posts.filter(
    (post) =>
      normalizeValue(
        post.collection.category
      ) === normalizedCategory &&
      normalizeTopic(
        post.collection.topic
      ) === normalizedTopic
  );

  const aggregatedItems = new Map<
    string,
    AggregatedItem
  >();

  matchingPosts.forEach((post) => {
    post.collection.items.forEach(
      (item, index) => {
        if (!item) {
          return;
        }

        const points =
          RANK_POINTS[index] ?? 0;

        const existingItem =
          aggregatedItems.get(item.id);

        if (existingItem) {
          existingItem.score += points;
          existingItem.appearanceCount += 1;

          if (index === 0) {
            existingItem.firstPlaceCount += 1;
          }

          return;
        }

        aggregatedItems.set(item.id, {
          item,
          score: points,
          firstPlaceCount:
            index === 0 ? 1 : 0,
          appearanceCount: 1,
        });
      }
    );
  });

  const items = Array.from(
    aggregatedItems.values()
  )
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      if (
        second.firstPlaceCount !==
        first.firstPlaceCount
      ) {
        return (
          second.firstPlaceCount -
          first.firstPlaceCount
        );
      }

      if (
        second.appearanceCount !==
        first.appearanceCount
      ) {
        return (
          second.appearanceCount -
          first.appearanceCount
        );
      }

      const firstRating =
        first.item.rating ?? 0;

      const secondRating =
        second.item.rating ?? 0;

      if (secondRating !== firstRating) {
        return secondRating - firstRating;
      }

      return first.item.title.localeCompare(
        second.item.title
      );
    })
    .slice(0, limit);

  const categoryLabel =
    matchingPosts[0]?.collection.category ??
    options.category;

  const topicLabel =
    matchingPosts[0]?.collection.topic ??
    normalizedTopic;

  return {
    category: categoryLabel,
    topic: topicLabel,
    title: createResultTitle(
      categoryLabel,
      topicLabel
    ),
    totalLists: matchingPosts.length,
    items,
  };
}