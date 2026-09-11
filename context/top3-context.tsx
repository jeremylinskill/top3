import { useProfile } from '@/context/profile-context';
import { useAuth } from '@/hooks/use-auth';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  createCollection,
  deleteCollection,
  getCollections,
  publishCollection,
  updateCollection,
} from '@/lib/supabase/collections';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import { Post } from '@/types/post';
import { Top3Item } from '@/types/top3-item';
import { Top3List } from '@/types/top3-list';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type CreateListInput = {
  category: string;
  type?: string;
  topic?: string;
  title: string;
};

type Top3ContextValue = {
  lists: Top3List[];
  posts: Post[];
  currentList: Top3List | null;
  isCollectionsLoaded: boolean;
  hasCollectionsLoadError: boolean;
  retryCollectionsLoad: () => void;
  createList: (input: CreateListInput) => Promise<string>;
  selectList: (listId: string) => void;
  setItemAtRank: (
    rank: number,
    item: Top3Item
  ) => void;
  removeItemAtRank: (rank: number) => void;
  setItems: (items: Top3List['items']) => void;
  discardPublishedListChanges: (
    listId: string
  ) => void;
  publishCurrentList: () => Promise<void>;
  deleteCurrentList: () => Promise<void>;
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

function cloneTop3List(list: Top3List): Top3List {
  return {
    ...list,
    items: [
      ...list.items,
    ] as Top3List['items'],
  };
}

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

  const [
    hasCollectionsLoadError,
    setHasCollectionsLoadError,
  ] = useState(false);

  const [
    collectionsLoadAttempt,
    setCollectionsLoadAttempt,
  ] = useState(0);

  const collectionItemSaveQueuesRef =
    useRef<Map<string, Promise<void>>>(
      new Map()
    );

  const collectionItemSaveRevisionRef =
    useRef<Map<string, number>>(
      new Map()
    );

  const publishedListSnapshotsRef =
    useRef<Map<string, Top3List>>(
      new Map()
    );

  const currentList = useMemo(
    () =>
      lists.find(
        (list) => list.id === currentListId
      ) ?? null,
    [lists, currentListId]
  );

  const isCollectionsLoaded =
    Boolean(user?.id) &&
    loadedUserId === user?.id;

  useEffect(() => {
    let isCancelled = false;

    async function loadCollections() {
      setLoadedUserId(null);
      setLists([]);
      setPosts([]);
      setCurrentListId('');
      setHasCollectionsLoadError(false);
      publishedListSnapshotsRef.current.clear();

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

        publishedListSnapshotsRef.current =
          new Map(
            savedLists
              .filter((list) =>
                Boolean(list.publishedAt)
              )
              .map(
                (list): [string, Top3List] => [
                  list.id,
                  cloneTop3List(list),
                ]
              )
          );

        setLists(savedLists);

        setPosts(savedPosts);
        setCurrentListId('');
        setLoadedUserId(userId);
        setHasCollectionsLoadError(false);
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load collections from Supabase:',
            error
          );
        }

        if (isCancelled) {
          return;
        }

        setLists([]);
        setPosts([]);
        setCurrentListId('');
        setLoadedUserId(null);
        setHasCollectionsLoadError(true);
        publishedListSnapshotsRef.current.clear();
      }
    }

    loadCollections();

    return () => {
      isCancelled = true;
    };
  }, [user, collectionsLoadAttempt]);

  function retryCollectionsLoad() {
    if (!user?.id) {
      return;
    }

    setCollectionsLoadAttempt(
      (currentAttempt) =>
        currentAttempt + 1
    );
  }

  useEffect(() => {
    const userId = user?.id;

    if (!userId) {
      return;
    }

    return subscribeToTableChanges({
      channelName:
        `moderation-removals-${userId}`,
      table:
        'moderation_content_removals',
      filter: `user_id=eq.${userId}`,
      onChange: (payload) => {
        if (
          payload.eventType !== 'INSERT'
        ) {
          return;
        }

        const targetType =
          payload.new.target_type;

        const targetId =
          payload.new.target_id;

        if (
          targetType !== 'post' ||
          typeof targetId !== 'string' ||
          !targetId
        ) {
          return;
        }

        publishedListSnapshotsRef.current.delete(
          targetId
        );

        setLists((currentLists) =>
          currentLists.filter(
            (list) =>
              list.id !== targetId
          )
        );

        setPosts((currentPosts) =>
          currentPosts.filter(
            (post) =>
              post.collection.id !==
              targetId
          )
        );

        setCurrentListId(
          (currentId) =>
            currentId === targetId
              ? ''
              : currentId
        );
      },
    });
  }, [user?.id]);

  async function createList(
    input: CreateListInput
  ): Promise<string> {
    const normalizedCategory =
      input.category.trim().toLowerCase();

    const normalizedType =
      input.type?.trim().toLowerCase() ??
      'general';

    const normalizedTopic =
      input.topic?.trim().toLowerCase() ??
      'general';

    const existingList = lists.find((list) => {
      const existingCategory =
        list.category.trim().toLowerCase();

      const existingType =
        list.type?.trim().toLowerCase() ??
        'general';

      const existingTopic =
        list.topic?.trim().toLowerCase() ??
        'general';

      return (
        existingCategory ===
          normalizedCategory &&
        existingType === normalizedType &&
        existingTopic === normalizedTopic
      );
    });

    if (existingList) {
      const existingListId =
        existingList.id;

      if (existingList.title !== input.title) {
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

        if (savedList.publishedAt) {
          publishedListSnapshotsRef.current.set(
            existingListId,
            cloneTop3List(savedList)
          );
        }
      }

      setCurrentListId(existingListId);
      return existingListId;
    }

    if (!user) {
      throw new Error(
        'A signed-in user is required to create a collection.'
      );
    }

    const savedList =
      await createCollection({
        userId: user.id,
        category: input.category,
        type: input.type,
        topic: input.topic,
        title: input.title,
        items: [null, null, null],
      });

    setLists((currentLists) => [
      ...currentLists,
      savedList,
    ]);

    setCurrentListId(savedList.id);

    trackAnalyticsEvent(
      'collection_started',
      {
        category: savedList.category,
      }
    );

    return savedList.id;
  }

  function selectList(listId: string) {
    const listExists = lists.some(
      (list) => list.id === listId
    );

    if (listExists) {
      setCurrentListId(listId);
    }
  }

  function queueCollectionItemsSave(
    collectionId: string,
    items: Top3List['items'],
    onSaved?: (savedList: Top3List) => void
  ) {
    const nextRevision =
      (collectionItemSaveRevisionRef.current.get(
        collectionId
      ) ?? 0) + 1;

    collectionItemSaveRevisionRef.current.set(
      collectionId,
      nextRevision
    );

    const previousSave =
      collectionItemSaveQueuesRef.current.get(
        collectionId
      ) ?? Promise.resolve();

    const nextSave = previousSave
      .catch(() => undefined)
      .then(async () => {
        const savedList = await updateCollection(
          collectionId,
          { items }
        );

        const latestRevision =
          collectionItemSaveRevisionRef.current.get(
            collectionId
          );

        if (latestRevision === nextRevision) {
          setLists((currentLists) =>
            currentLists.map((list) =>
              list.id === collectionId
                ? savedList
                : list
            )
          );
        }

        onSaved?.(savedList);
      })
      .catch((error) => {
        if (__DEV__) {
          console.log(
            'Failed to save collection items:',
            error
          );
        }
      });

    collectionItemSaveQueuesRef.current.set(
      collectionId,
      nextSave
    );

    void nextSave.then(() => {
      if (
        collectionItemSaveQueuesRef.current.get(
          collectionId
        ) === nextSave
      ) {
        collectionItemSaveQueuesRef.current.delete(
          collectionId
        );
      }
    });
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

    const wasComplete =
      currentList.items.every(
        (existingItem) =>
          existingItem !== null
      );

    const isNowComplete =
      nextItems.every(
        (nextItem) =>
          nextItem !== null
      );

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

    if (!currentList.publishedAt) {
      queueCollectionItemsSave(
        collectionId,
        nextItems,
        (savedList) => {
          if (
            !wasComplete &&
            isNowComplete
          ) {
            trackAnalyticsEvent(
              'collection_completed',
              {
                category:
                  savedList.category,
              }
            );
          }
        }
      );
    }
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

    if (!currentList.publishedAt) {
      queueCollectionItemsSave(
        collectionId,
        nextItems
      );
    }
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

    if (!currentList.publishedAt) {
      queueCollectionItemsSave(
        collectionId,
        items
      );
    }
  }

  const discardPublishedListChanges = useCallback(
    (listId: string) => {
      const snapshot =
        publishedListSnapshotsRef.current.get(
          listId
        );

      if (!snapshot) {
        return;
      }

      setLists((currentLists) =>
        currentLists.map((list) =>
          list.id === listId
            ? cloneTop3List(snapshot)
            : list
        )
      );
    },
    []
  );

  async function publishCurrentList(): Promise<void> {
    if (!currentList) {
      throw new Error(
        'A current collection is required to publish a collection.'
      );
    }

    const collectionId = currentList.id;
    const wasAlreadyPublished =
      Boolean(currentList.publishedAt);

    const pendingItemsSave =
      collectionItemSaveQueuesRef.current.get(
        collectionId
      );

    if (pendingItemsSave) {
      await pendingItemsSave;
    }

    const savedList = await publishCollection(
      collectionId,
      currentList.items
    );

    if (!savedList.publishedAt) {
      throw new Error(
        'Published collection is missing its published date.'
      );
    }

    publishedListSnapshotsRef.current.set(
      collectionId,
      cloneTop3List(savedList)
    );

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

    trackAnalyticsEvent(
      wasAlreadyPublished
        ? 'collection_edited'
        : 'collection_published',
      {
        category: savedList.category,
        rankCount:
          savedList.items.filter(
            (item) => item !== null
          ).length,
      }
    );
  }


  async function deleteCurrentList(): Promise<void> {
    if (!currentList) {
      throw new Error(
        'A current collection is required to delete a collection.'
      );
    }

    const collectionId = currentList.id;

    await deleteCollection(collectionId);

    publishedListSnapshotsRef.current.delete(
      collectionId
    );

    setLists((currentLists) =>
      currentLists.filter(
        (list) => list.id !== collectionId
      )
    );

    setPosts((currentPosts) =>
      currentPosts.filter(
        (post) =>
          post.collection.id !== collectionId
      )
    );

    setCurrentListId('');
  }

  return (
    <Top3Context.Provider
      value={{
        lists,
        posts,
        currentList,
        isCollectionsLoaded,
        hasCollectionsLoadError,
        retryCollectionsLoad,
        createList,
        selectList,
        setItemAtRank,
        removeItemAtRank,
        setItems,
        discardPublishedListChanges,
        publishCurrentList,
        deleteCurrentList,
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
