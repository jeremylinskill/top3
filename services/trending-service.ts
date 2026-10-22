import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import type { CollectionOption } from '@/types/collection-option';
import { Post } from '@/types/post';
import type { TrendingThemeActivityPost } from '@/types/trending-theme-activity';

export const TRENDING_WINDOW_DAYS = 30;

export type TrendingCategory = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  listCount: number;
};

export type TrendingTopic = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  topic: string;
  listCount: number;
};

export type TrendingTheme = {
  themeId: string;
  categoryId: string;
  listCount: number;
  uniqueCreatorCount: number;
  recentCreatorCount: number;
  latestPublishedAt: string;
};

type TrendingWindowOptions = {
  fallbackToAll?: boolean;
};

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function formatTopicLabel(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

export function getTrendingWindowPosts(
  posts: Post[],
  options: TrendingWindowOptions = {}
): Post[] {
  const {
    fallbackToAll = true,
  } = options;

  const cutoffTime =
    Date.now() -
    TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const recentPosts = posts.filter((post) => {
    const publishedTime = new Date(
      post.publishedAt
    ).getTime();

    return (
      Number.isFinite(publishedTime) &&
      publishedTime >= cutoffTime
    );
  });

  if (recentPosts.length > 0) {
    return recentPosts;
  }

  return fallbackToAll
    ? posts
    : [];
}

export function getTrendingCategories(
  posts: Post[],
  limit = 3
): TrendingCategory[] {
  const counts = new Map<string, number>();

  posts.forEach((post) => {
    const categoryId = normalizeValue(
      post.collection.category
    );

    const postTopic =
      normalizeValue(post.collection.topic) ||
      'general';

    if (!categoryId || postTopic !== 'general') {
      return;
    }

    counts.set(
      categoryId,
      (counts.get(categoryId) ?? 0) + 1
    );
  });

  return TOP3_CATEGORIES
    .map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
      listCount:
        counts.get(
          normalizeValue(category.id)
        ) ?? 0,
    }))
    .filter(
      (category) => category.listCount > 0
    )
    .sort((first, second) => {
      if (
        second.listCount !== first.listCount
      ) {
        return (
          second.listCount - first.listCount
        );
      }

      return first.categoryName.localeCompare(
        second.categoryName
      );
    })
    .slice(0, limit);
}

export function getTrendingTopics(
  posts: Post[],
  limit = 3
): TrendingTopic[] {
  const topicMap = new Map<
    string,
    TrendingTopic
  >();

  posts.forEach((post) => {
    // Themes are their own content type now and
    // should not also appear as ordinary topics.
    if (post.collection.themeId) {
      return;
    }

    const categoryId = normalizeValue(
      post.collection.category
    );

    const rawTopic =
      post.collection.topic?.trim();

    if (!categoryId || !rawTopic) {
      return;
    }

    const normalizedTopic =
      normalizeValue(rawTopic);

    if (
      !normalizedTopic ||
      normalizedTopic === 'general'
    ) {
      return;
    }

    const category = TOP3_CATEGORIES.find(
      (item) =>
        normalizeValue(item.id) === categoryId
    );

    if (!category) {
      return;
    }

    const topicId =
      `${categoryId}:${normalizedTopic}`;

    const existingTopic =
      topicMap.get(topicId);

    if (existingTopic) {
      existingTopic.listCount += 1;
      return;
    }

    topicMap.set(topicId, {
      id: topicId,
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
      topic: formatTopicLabel(rawTopic),
      listCount: 1,
    });
  });

  return Array.from(topicMap.values())
    .sort((first, second) => {
      if (
        second.listCount !== first.listCount
      ) {
        return (
          second.listCount - first.listCount
        );
      }

      const topicComparison =
        first.topic.localeCompare(
          second.topic
        );

      if (topicComparison !== 0) {
        return topicComparison;
      }

      return first.categoryName.localeCompare(
        second.categoryName
      );
    })
    .slice(0, limit);
}

export function getTrendingThemes(
  posts: TrendingThemeActivityPost[],
  availableThemes: CollectionOption[]
): TrendingTheme[] {
  const optionByIdentity = new Map<string, CollectionOption>();

  for (const option of availableThemes) {
    if (
      option.kind !== 'theme' ||
      !option.active ||
      !option.trendingEnabled
    ) {
      continue;
    }

    const category = normalizeValue(option.categoryId);

    optionByIdentity.set(
      `${category}:${normalizeValue(option.id)}`,
      option
    );
    optionByIdentity.set(
      `${category}:${normalizeValue(option.slug)}`,
      option
    );
  }

  const recentCutoff =
    Date.now() - 7 * 24 * 60 * 60 * 1000;

  const counts = new Map<
    string,
    {
      themeId: string;
      categoryId: string;
      listCount: number;
      creatorIds: Set<string>;
      recentCreatorIds: Set<string>;
      latestPublishedAt: string;
    }
  >();

  const trendingCutoff =
    Date.now() -
    TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  for (const post of posts) {
    const publishedTime = new Date(
      post.publishedAt
    ).getTime();

    if (
      !Number.isFinite(publishedTime) ||
      publishedTime < trendingCutoff
    ) {
      continue;
    }
    const category = normalizeValue(
      post.collection.category
    );
    const creator = post.authorId?.trim();

    if (!category || !creator) {
      continue;
    }

    const fullId = normalizeValue(
      post.collection.collectionOptionId
    );
    const slug = normalizeValue(
      post.collection.themeId
    );

    const option =
      optionByIdentity.get(`${category}:${fullId}`) ??
      optionByIdentity.get(`${category}:${slug}`);

    if (!option) {
      continue;
    }

    const key = `${category}:${option.id}`;
    const existing = counts.get(key);

    if (existing) {
      existing.listCount += 1;
      existing.creatorIds.add(creator);

      if (publishedTime >= recentCutoff) {
        existing.recentCreatorIds.add(creator);
      }

      if (
        publishedTime >
        new Date(existing.latestPublishedAt).getTime()
      ) {
        existing.latestPublishedAt = post.publishedAt;
      }

      continue;
    }

    counts.set(key, {
      themeId: option.slug,
      categoryId: category,
      listCount: 1,
      creatorIds: new Set([creator]),
      recentCreatorIds: new Set(
        publishedTime >= recentCutoff ? [creator] : []
      ),
      latestPublishedAt: post.publishedAt,
    });
  }

  return [...counts.values()]
    .map((theme) => ({
      themeId: theme.themeId,
      categoryId: theme.categoryId,
      listCount: theme.listCount,
      uniqueCreatorCount: theme.creatorIds.size,
      recentCreatorCount: theme.recentCreatorIds.size,
      latestPublishedAt: theme.latestPublishedAt,
    }))
    .sort(
      (first, second) =>
        second.uniqueCreatorCount -
          first.uniqueCreatorCount ||
        second.recentCreatorCount -
          first.recentCreatorCount ||
        first.categoryId.localeCompare(
          second.categoryId
        ) ||
        first.themeId.localeCompare(
          second.themeId
        )
    );
}
