import {
  getPublishedPostsByUser as getPublishedPostsByUserFromSupabase,
  getPublishedPosts as getPublishedPostsFromSupabase,
} from '@/lib/supabase/collections';
import { searchByCategory } from '@/providers/search';
import { Post } from '@/types/post';
import { Top3Item } from '@/types/top3-item';
import { Top3List } from '@/types/top3-list';

const hydratedItemCache = new Map<
  string,
  Top3Item | null
>();

function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

function findBestMatch(
  originalItem: Top3Item,
  results: Top3Item[]
) {
  const normalizedOriginalTitle =
    normalizeTitle(originalItem.title);

  const exactMatch = results.find(
    (result) =>
      normalizeTitle(result.title) ===
      normalizedOriginalTitle
  );

  return exactMatch ?? results[0] ?? null;
}

async function hydrateItem(
  item: Top3Item,
  category: string
): Promise<Top3Item> {
  if (item.imageUrl) {
    return item;
  }

  const cacheKey = `${category}:${normalizeTitle(
    item.title
  )}`;

  if (hydratedItemCache.has(cacheKey)) {
    const cachedItem =
      hydratedItemCache.get(cacheKey);

    return cachedItem
      ? {
          ...item,
          ...cachedItem,
          id: item.id,
        }
      : item;
  }

  try {
    const results =
      await searchByCategory(
        category,
        item.title
      );

    const matchingItem = findBestMatch(
      item,
      results
    );

    hydratedItemCache.set(
      cacheKey,
      matchingItem
    );

    if (!matchingItem) {
      return item;
    }

    return {
      ...item,
      subtitle:
        matchingItem.subtitle ?? item.subtitle,
      imageUrl: matchingItem.imageUrl,
      rating: matchingItem.rating,
    };
  } catch (error) {
    console.error(
      `Failed to load artwork for ${item.title}:`,
      error
    );

    hydratedItemCache.set(cacheKey, null);

    return item;
  }
}

async function hydratePost(
  post: Post
): Promise<Post> {
  const hydratedItems = await Promise.all(
    post.collection.items.map((item) =>
      item
        ? hydrateItem(
            item,
            post.collection.category
          )
        : Promise.resolve(null)
    )
  );

  return {
    ...post,
    collection: {
      ...post.collection,
      items:
        hydratedItems as Top3List['items'],
    },
  };
}

function sortPostsByPublishedDate(
  posts: Post[]
): Post[] {
  return [...posts].sort(
    (first, second) =>
      new Date(second.publishedAt).getTime() -
      new Date(first.publishedAt).getTime()
  );
}

export async function getPublishedPosts(): Promise<
  Post[]
> {
  const publishedPosts =
    await getPublishedPostsFromSupabase();

  const hydratedPosts = await Promise.all(
    publishedPosts.map((post) =>
      hydratePost(post)
    )
  );

  return sortPostsByPublishedDate(
    hydratedPosts
  );
}

export async function getPublishedPostsByUser(
  userId: string
): Promise<Post[]> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return [];
  }

  const publishedPosts =
    await getPublishedPostsByUserFromSupabase(
      normalizedUserId
    );

  const hydratedPosts = await Promise.all(
    publishedPosts.map((post) =>
      hydratePost(post)
    )
  );

  return sortPostsByPublishedDate(
    hydratedPosts
  );
}