import { repairCollectionArtwork } from '@/lib/supabase/artwork-repair';
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

const inFlightHydratedItemCache = new Map<
  string,
  Promise<Top3Item | null>
>();

const repairedBookArtworkCache = new Map<
  string,
  string | null
>();

const inFlightBookArtworkRepairCache = new Map<
  string,
  Promise<string | null>
>();


type PublishedPostsOptions = {
  hydrateMissingArtwork?: boolean;
};



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

  let lookupPromise =
    inFlightHydratedItemCache.get(
      cacheKey
    );

  if (!lookupPromise) {
    lookupPromise = (async () => {
      try {
        const results =
          await searchByCategory(
            category,
            item.title
          );

        const matchingItem =
          findBestMatch(
            item,
            results
          );


        hydratedItemCache.set(
          cacheKey,
          matchingItem
        );


        return matchingItem;
      } catch (error) {

        if (__DEV__) {
          console.log(
            'Artwork lookup failed:',
            {
              title: item.title,
              category,
              itemId: item.id,
              error,
            }
          );
        }

        hydratedItemCache.set(
          cacheKey,
          null
        );

        return null;
      } finally {
        inFlightHydratedItemCache.delete(
          cacheKey
        );
      }
    })();

    inFlightHydratedItemCache.set(
      cacheKey,
      lookupPromise
    );
  }

  const matchingItem =
    await lookupPromise;

  if (!matchingItem) {
    return item;
  }

  return {
    ...item,
    ...matchingItem,
    id: item.id,
    subtitle:
      matchingItem.subtitle ?? item.subtitle,
    imageUrl:
      matchingItem.imageUrl ?? item.imageUrl,
    rating:
      matchingItem.rating ?? item.rating,
  };
}

async function repairBookArtworkItem(
  collectionId: string,
  item: Top3Item
): Promise<Top3Item> {
  if (item.imageUrl) {
    return item;
  }

  const cacheKey =
    `${collectionId}:${item.id}`;

  if (
    repairedBookArtworkCache.has(
      cacheKey
    )
  ) {

    const cachedImageUrl =
      repairedBookArtworkCache.get(
        cacheKey
      );

    return cachedImageUrl
      ? {
          ...item,
          imageUrl:
            cachedImageUrl,
        }
      : item;
  }

  let repairPromise =
    inFlightBookArtworkRepairCache.get(
      cacheKey
    );

  if (!repairPromise) {
    repairPromise = (async () => {
      try {
        const result =
          await repairCollectionArtwork(
            collectionId,
            item.id
          );

        const imageUrl =
          result.imageUrl?.trim() ||
          null;


        repairedBookArtworkCache.set(
          cacheKey,
          imageUrl
        );


        return imageUrl;
      } catch (error) {

        if (__DEV__) {
          console.log(
            'Book artwork repair failed:',
            {
              collectionId,
              itemId: item.id,
              title: item.title,
              error,
            }
          );
        }

        repairedBookArtworkCache.set(
          cacheKey,
          null
        );

        return null;
      } finally {
        inFlightBookArtworkRepairCache.delete(
          cacheKey
        );
      }
    })();

    inFlightBookArtworkRepairCache.set(
      cacheKey,
      repairPromise
    );
  }

  const imageUrl =
    await repairPromise;

  return imageUrl
    ? {
        ...item,
        imageUrl,
      }
    : item;
}

async function hydrateFeedPostArtwork(
  post: Post
): Promise<Post> {
  const isBookCollection =
    post.collection.category ===
    'books';

  const hydratedItems =
    await Promise.all(
      post.collection.items.map(
        (item) => {
          if (!item) {
            return Promise.resolve(
              null
            );
          }

          return isBookCollection
            ? repairBookArtworkItem(
                post.collection.id,
                item
              )
            : hydrateItem(
                item,
                post.collection.category
              );
        }
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

export async function hydrateMissingArtworkInPosts(
  posts: Post[]
): Promise<Post[]> {
  return Promise.all(
    posts.map((post) =>
      hydrateFeedPostArtwork(
        post
      )
    )
  );
}

export async function getPublishedPosts(
  options: PublishedPostsOptions = {}
): Promise<Post[]> {
  const {
    hydrateMissingArtwork = true,
  } = options;

  const publishedPosts =
    await getPublishedPostsFromSupabase();

  if (!hydrateMissingArtwork) {
    return sortPostsByPublishedDate(
      publishedPosts
    );
  }

  const hydratedPosts = await Promise.all(
    publishedPosts.map((post) =>
      hydratePost(
        post
      )
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
      hydratePost(
        post
      )
    )
  );

  return sortPostsByPublishedDate(
    hydratedPosts
  );
}
