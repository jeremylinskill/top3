import { useProfile } from '@/context/profile-context';
import { useAuth } from '@/hooks/use-auth';
import {
  createCollection,
  getCollections,
  publishCollection,
  updateCollection,
} from '@/lib/supabase/collections';
import { Post } from '@/types/post';
import { Top3Item } from '@/types/top3-item';
import { Top3List } from '@/types/top3-list';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type CreateListInput = {
  category: string;
  topic?: string;
  title: string;
};

type Top3ContextValue = {
  lists: Top3List[];
  posts: Post[];
  currentList: Top3List | null;
  createList: (input: CreateListInput) => string;
  selectList: (listId: string) => void;
  setItemAtRank: (
    rank: number,
    item: Top3Item
  ) => void;
  removeItemAtRank: (rank: number) => void;
  setItems: (items: Top3List['items']) => void;
  publishCurrentList: () => void;
};

type Top3ProviderProps = {
  children: ReactNode;
};

type StoredTop3Data = {
  lists: Top3List[];
  posts?: Post[];
  currentListId?: string;
};

const Top3Context =
  createContext<Top3ContextValue | undefined>(
    undefined
  );

function createPostsFromPublishedLists(
  lists: Top3List[],
  authorId: string
): Post[] {
  return lists
    .filter(
      (
        list
      ): list is Top3List & {
        publishedAt: string;
      } => Boolean(list.publishedAt)
    )
    .map((list) => ({
      id: `post-${list.id}`,
      authorId,
      collection: {
        ...list,
        items: [
          ...list.items,
        ] as Top3List['items'],
      },
      publishedAt: list.publishedAt,
      reactions: 0,
      comments: 0,
    }));
}

export function Top3Provider({
  children,
}: Top3ProviderProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [lists, setLists] = useState<Top3List[]>(
    []
  );

  const [posts, setPosts] = useState<Post[]>([]);

  const [currentListId, setCurrentListId] =
    useState('');

  const [loadedUserId, setLoadedUserId] =
    useState<string | null>(null);

  const currentList = useMemo(
    () =>
      lists.find(
        (list) => list.id === currentListId
      ) ?? null,
    [lists, currentListId]
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadCollections() {
      setLoadedUserId(null);
      setLists([]);
      setPosts([]);
      setCurrentListId('');

      if (!user) {
        return;
      }

      const userId = user.id;

      try {
        const savedLists = await getCollections(
          userId
        );

        if (isCancelled) {
          return;
        }

        const savedPosts =
          createPostsFromPublishedLists(
            savedLists,
            userId
          );

        setLists(savedLists);

        setPosts(savedPosts);
        setCurrentListId('');
        setLoadedUserId(userId);
      } catch (error) {
        console.error(
          'Failed to load collections from Supabase:',
          error
        );

        if (isCancelled) {
          return;
        }

        setLists([]);
        setPosts([]);
        setCurrentListId('');
        setLoadedUserId(userId);
      }
    }

    loadCollections();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  function createList(
    input: CreateListInput
  ): string {
    const normalizedCategory =
      input.category.trim().toLowerCase();

    const normalizedTopic =
      input.topic?.trim().toLowerCase() ??
      'general';

    const existingList = lists.find((list) => {
      const existingCategory =
        list.category.trim().toLowerCase();

      const existingTopic =
        list.topic?.trim().toLowerCase() ??
        'general';

      return (
        existingCategory ===
          normalizedCategory &&
        existingTopic === normalizedTopic
      );
    });

    if (existingList) {
      const existingListId =
        existingList.id;

      if (existingList.title !== input.title) {
        const now =
          new Date().toISOString();

        setLists((currentLists) =>
          currentLists.map((list) =>
            list.id === existingListId
              ? {
                  ...list,
                  title: input.title,
                  updatedAt: now,
                }
              : list
          )
        );

        async function saveExistingTitle() {
          try {
            const savedList =
              await updateCollection(
                existingListId,
                {
                  title: input.title,
                }
              );

            setLists((currentLists) =>
              currentLists.map((list) =>
                list.id === existingListId
                  ? savedList
                  : list
              )
            );
          } catch (error) {
            console.error(
              'Failed to update existing collection title:',
              error
            );
          }
        }

        saveExistingTitle();
      }

      setCurrentListId(existingListId);
      return existingListId;
    }

    if (!user) {
      throw new Error(
        'A signed-in user is required to create a collection.'
      );
    }

    const userId = user.id;

    const now = new Date().toISOString();

    const temporaryId =
      `pending-${normalizedCategory}-` +
      `${normalizedTopic}-${Date.now()}`;

    const pendingList: Top3List = {
      id: temporaryId,
      category: input.category,
      topic: input.topic,
      title: input.title,
      items: [null, null, null],
      createdAt: now,
      updatedAt: now,
    };

    setLists((currentLists) => [
      ...currentLists,
      pendingList,
    ]);

    setCurrentListId(temporaryId);

    async function saveCollection() {
      try {
        const savedList = await createCollection({
          userId,
          category: input.category,
          topic: input.topic,
          title: input.title,
          items: [null, null, null],
        });

        setLists((currentLists) =>
          currentLists.map((list) =>
            list.id === temporaryId
              ? savedList
              : list
          )
        );

        setCurrentListId((currentId) =>
          currentId === temporaryId
            ? savedList.id
            : currentId
        );
      } catch (error) {
        console.error(
          'Failed to create collection in Supabase:',
          error
        );

        setLists((currentLists) =>
          currentLists.filter(
            (list) => list.id !== temporaryId
          )
        );

        setCurrentListId((currentId) =>
          currentId === temporaryId
            ? ''
            : currentId
        );
      }
    }

    saveCollection();

    return temporaryId;
  }

  function selectList(listId: string) {
    const listExists = lists.some(
      (list) => list.id === listId
    );

    if (listExists) {
      setCurrentListId(listId);
    }
  }

  function setItemAtRank(
    rank: number,
    item: Top3Item
  ) {
    if (
      !currentList ||
      rank < 1 ||
      rank > 3
    ) {
      return;
    }

    const collectionId = currentList.id;
    const nextItems = [
      ...currentList.items,
    ] as Top3List['items'];

    nextItems[rank - 1] = item;

    const now = new Date().toISOString();

    setLists((currentLists) =>
      currentLists.map((list) =>
        list.id === collectionId
          ? {
              ...list,
              items: nextItems,
              updatedAt: now,
            }
          : list
      )
    );

    async function saveItems() {
      try {
        const savedList = await updateCollection(
          collectionId,
          { items: nextItems }
        );

        setLists((currentLists) =>
          currentLists.map((list) =>
            list.id === collectionId
              ? savedList
              : list
          )
        );
      } catch (error) {
        console.error(
          'Failed to save collection item:',
          error
        );
      }
    }

    saveItems();
  }

  function removeItemAtRank(rank: number) {
    if (
      !currentList ||
      rank < 1 ||
      rank > 3
    ) {
      return;
    }

    const collectionId = currentList.id;

    const remainingItems = currentList.items.filter(
      (item, index): item is Top3Item =>
        item !== null && index !== rank - 1
    );

    const nextItems = [
      ...remainingItems,
      ...Array(3 - remainingItems.length).fill(
        null
      ),
    ] as Top3List['items'];

    const now = new Date().toISOString();

    setLists((currentLists) =>
      currentLists.map((list) =>
        list.id === collectionId
          ? {
              ...list,
              items: nextItems,
              updatedAt: now,
            }
          : list
      )
    );

    async function saveItems() {
      try {
        const savedList = await updateCollection(
          collectionId,
          { items: nextItems }
        );

        setLists((currentLists) =>
          currentLists.map((list) =>
            list.id === collectionId
              ? savedList
              : list
          )
        );
      } catch (error) {
        console.error(
          'Failed to remove collection item:',
          error
        );
      }
    }

    saveItems();
  }

  function setItems(
    items: Top3List['items']
  ) {
    if (!currentList) {
      return;
    }

    const collectionId = currentList.id;
    const now = new Date().toISOString();

    setLists((currentLists) =>
      currentLists.map((list) =>
        list.id === collectionId
          ? {
              ...list,
              items,
              updatedAt: now,
            }
          : list
      )
    );

    async function saveItems() {
      try {
        const savedList = await updateCollection(
          collectionId,
          { items }
        );

        setLists((currentLists) =>
          currentLists.map((list) =>
            list.id === collectionId
              ? savedList
              : list
          )
        );
      } catch (error) {
        console.error(
          'Failed to reorder collection items:',
          error
        );
      }
    }

    saveItems();
  }

  function publishCurrentList() {
    if (!currentList) {
      return;
    }

    const collectionId = currentList.id;

    async function savePublishedCollection() {
      try {
        const savedList = await publishCollection(
          collectionId
        );

        if (!savedList.publishedAt) {
          throw new Error(
            'Published collection is missing its published date.'
          );
        }

        setLists((currentLists) =>
          currentLists.map((list) =>
            list.id === collectionId
              ? savedList
              : list
          )
        );

        setPosts((currentPosts) => {
          const existingPostIndex =
            currentPosts.findIndex(
              (post) =>
                post.collection.id ===
                  collectionId &&
                post.authorId === profile.id
            );

          const nextPost: Post = {
            id:
              existingPostIndex >= 0
                ? currentPosts[
                    existingPostIndex
                  ].id
                : `post-${collectionId}`,
            authorId: profile.id,
            collection: savedList,
            publishedAt: savedList.publishedAt!,
            reactions:
              existingPostIndex >= 0
                ? currentPosts[
                    existingPostIndex
                  ].reactions
                : 0,
            comments:
              existingPostIndex >= 0
                ? currentPosts[
                    existingPostIndex
                  ].comments
                : 0,
          };

          if (existingPostIndex < 0) {
            return [
              nextPost,
              ...currentPosts,
            ];
          }

          return currentPosts.map(
            (post, index) =>
              index === existingPostIndex
                ? nextPost
                : post
          );
        });
      } catch (error) {
        console.error(
          'Failed to publish collection in Supabase:',
          error
        );
      }
    }

    savePublishedCollection();
  }

  return (
    <Top3Context.Provider
      value={{
        lists,
        posts,
        currentList,
        createList,
        selectList,
        setItemAtRank,
        removeItemAtRank,
        setItems,
        publishCurrentList,
      }}>
      {children}
    </Top3Context.Provider>
  );
}

export function useTop3() {
  const context = useContext(Top3Context);

  if (!context) {
    throw new Error(
      'useTop3 must be used inside a Top3Provider'
    );
  }

  return context;
}