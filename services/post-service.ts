import { MOCK_USERS } from '@/constants/mock-users';
import { searchBooks } from '@/providers/google-books';
import { searchGames } from '@/providers/rawg';
import {
    searchMovies,
    searchTvShows,
} from '@/providers/tmdb';
import { Post } from '@/types/post';
import { Top3Item } from '@/types/top3-item';
import { Top3List } from '@/types/top3-list';

function createItem(
  id: string,
  title: string,
  subtitle?: string,
  imageUrl?: string
): Top3Item {
  return {
    id,
    title,
    subtitle,
    imageUrl,
  };
}

function createCollection(
  id: string,
  category: string,
  title: string,
  items: [Top3Item, Top3Item, Top3Item],
  topic?: string
): Top3List {
  const publishedAt = new Date().toISOString();

  return {
    id,
    category,
    topic,
    title,
    items,
    createdAt: publishedAt,
    updatedAt: publishedAt,
    publishedAt,
  };
}

function createPost(
  id: string,
  authorId: string,
  collection: Top3List,
  publishedAt: string
): Post {
  return {
    id,
    authorId,
    collection,
    publishedAt,
    reactions: 0,
    comments: 0,
  };
}

const MOCK_POSTS: Post[] = [
  createPost(
    'mock-post-alex-movies',
    'alex',
    createCollection(
      'mock-list-alex-movies',
      'movies',
      'Top 3 Movies',
      [
        createItem(
          'alex-movie-1',
          'The Social Network',
          '2010'
        ),
        createItem(
          'alex-movie-2',
          'Arrival',
          '2016'
        ),
        createItem(
          'alex-movie-3',
          'Heat',
          '1995'
        ),
      ]
    ),
    '2026-07-23T14:00:00.000Z'
  ),

  createPost(
    'mock-post-sarah-books',
    'sarah',
    createCollection(
      'mock-list-sarah-books',
      'books',
      'Top 3 Books',
      [
        createItem(
          'sarah-book-1',
          'The Secret History',
          'Donna Tartt'
        ),
        createItem(
          'sarah-book-2',
          'Tomorrow, and Tomorrow, and Tomorrow',
          'Gabrielle Zevin'
        ),
        createItem(
          'sarah-book-3',
          'Pachinko',
          'Min Jin Lee'
        ),
      ]
    ),
    '2026-07-23T13:30:00.000Z'
  ),

  createPost(
    'mock-post-chris-games',
    'chris',
    createCollection(
      'mock-list-chris-games',
      'games',
      'Top 3 Video Games',
      [
        createItem(
          'chris-game-1',
          'The Last of Us',
          'Naughty Dog'
        ),
        createItem(
          'chris-game-2',
          'Red Dead Redemption 2',
          'Rockstar Games'
        ),
        createItem(
          'chris-game-3',
          'Hades',
          'Supergiant Games'
        ),
      ]
    ),
    '2026-07-23T12:45:00.000Z'
  ),

  createPost(
    'mock-post-olivia-tv',
    'olivia',
    createCollection(
      'mock-list-olivia-tv',
      'tv',
      'Top 3 TV Shows',
      [
        createItem(
          'olivia-tv-1',
          'Succession',
          'HBO'
        ),
        createItem(
          'olivia-tv-2',
          'The Bear',
          'FX'
        ),
        createItem(
          'olivia-tv-3',
          'Fleabag',
          'BBC'
        ),
      ]
    ),
    '2026-07-23T11:20:00.000Z'
  ),

  createPost(
    'mock-post-daniel-movies',
    'daniel',
    createCollection(
      'mock-list-daniel-movies',
      'movies',
      'Top 3 Sci-Fi Movies',
      [
        createItem(
          'daniel-movie-1',
          'Blade Runner 2049',
          '2017'
        ),
        createItem(
          'daniel-movie-2',
          'Interstellar',
          '2014'
        ),
        createItem(
          'daniel-movie-3',
          'Ex Machina',
          '2014'
        ),
      ],
      'Sci-Fi'
    ),
    '2026-07-23T10:10:00.000Z'
  ),
];

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
  const normalizedOriginalTitle = normalizeTitle(
    originalItem.title
  );

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
    let results: Top3Item[] = [];

    if (category === 'movies') {
      results = await searchMovies(item.title);
    }

    if (category === 'tv') {
      results = await searchTvShows(item.title);
    }

    if (category === 'books') {
      results = await searchBooks(item.title);
    }

    if (category === 'games') {
      results = await searchGames(item.title);
    }

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

export function getMockPosts() {
  return [...MOCK_POSTS];
}

export function getMockUserById(
  userId: string
) {
  return (
    MOCK_USERS.find(
      (user) => user.id === userId
    ) ?? null
  );
}

export function getFeedPosts(
  currentUserPosts: Post[]
) {
  return [
    ...currentUserPosts,
    ...MOCK_POSTS,
  ].sort(
    (first, second) =>
      new Date(second.publishedAt).getTime() -
      new Date(first.publishedAt).getTime()
  );
}

export async function getHydratedFeedPosts(
  currentUserPosts: Post[]
): Promise<Post[]> {
  const feedPosts =
    getFeedPosts(currentUserPosts);

  return Promise.all(
    feedPosts.map((post) =>
      hydratePost(post)
    )
  );
}