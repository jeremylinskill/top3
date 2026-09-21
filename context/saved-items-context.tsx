import { CategoryId } from '@/constants/top3-categories';
import { useAuth } from '@/hooks/use-auth';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
    saveItem as createSavedItem,
    deleteSavedItem,
    getSavedItems,
    SavedItem,
    SaveItemSource,
} from '@/lib/supabase/saved-items';
import { Top3Item } from '@/types/top3-item';
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
import { AppState } from 'react-native';

type SavedItemsContextValue = {
  savedItems: SavedItem[];
  isLoading: boolean;
  hasLoadError: boolean;
  retrySavedItemsLoad: () => void;
  isSaved: (
    category: CategoryId,
    itemId: string
  ) => boolean;
  saveItem: (
    category: CategoryId,
    item: Top3Item,
    source?: SaveItemSource
  ) => void;
  unsaveItem: (
    category: CategoryId,
    itemId: string
  ) => void;
  toggleSavedItem: (
    category: CategoryId,
    item: Top3Item,
    source?: SaveItemSource
  ) => void;
};

type SavedItemsProviderProps = {
  children: ReactNode;
};

const SavedItemsContext =
  createContext<
    SavedItemsContextValue | undefined
  >(undefined);

function getSavedItemKey(
  category: CategoryId,
  itemId: string
) {
  return `${category}:${itemId}`;
}

function getPendingSavedItemKey(
  userId: string,
  category: CategoryId,
  itemId: string
) {
  return `${userId}:${getSavedItemKey(
    category,
    itemId
  )}`;
}

export function SavedItemsProvider({
  children,
}: SavedItemsProviderProps) {
  const { user } = useAuth();

  const [savedItems, setSavedItems] =
    useState<SavedItem[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [hasLoadError, setHasLoadError] =
    useState(false);

  const pendingItemKeysRef =
    useRef<Set<string>>(new Set());

  const mutationVersionRef = useRef(0);

  const userId = user?.id;

  const activeUserIdRef =
    useRef<string | undefined>(userId);

  activeUserIdRef.current = userId;

  const refreshSavedItems = useCallback(
    async ({
      showLoading = false,
      clearExisting = false,
    }: {
      showLoading?: boolean;
      clearExisting?: boolean;
    } = {}) => {
      if (!userId) {
        setSavedItems([]);
        setHasLoadError(false);
        setIsLoading(false);
        return;
      }

      if (pendingItemKeysRef.current.size > 0) {
        return;
      }

      const requestedUserId = userId;
      const refreshMutationVersion =
        mutationVersionRef.current;

      if (clearExisting) {
        setSavedItems([]);
      }

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const items =
          await getSavedItems(requestedUserId);

        if (
          activeUserIdRef.current !==
            requestedUserId ||
          mutationVersionRef.current !==
            refreshMutationVersion ||
          pendingItemKeysRef.current.size > 0
        ) {
          return;
        }

        setSavedItems(items);
        setHasLoadError(false);
      } catch (error) {
        if (
          showLoading &&
          activeUserIdRef.current ===
            requestedUserId
        ) {
          setHasLoadError(true);
        }

        if (__DEV__) {
          console.log(
            'Failed to load saved items:',
            error
          );
        }
      } finally {
        if (
          showLoading &&
          activeUserIdRef.current ===
            requestedUserId
        ) {
          setIsLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    pendingItemKeysRef.current.clear();

    let isCancelled = false;

    async function loadSavedItems() {
      setSavedItems([]);
      setHasLoadError(false);
      setIsLoading(true);

      if (!userId) {
        if (!isCancelled) {
          setIsLoading(false);
        }

        return;
      }

      try {
        const items =
          await getSavedItems(userId);

        if (isCancelled) {
          return;
        }

        setSavedItems(items);
        setHasLoadError(false);
      } catch (error) {
        if (!isCancelled) {
          setHasLoadError(true);
        }

        if (__DEV__) {
          console.log(
            'Failed to load saved items:',
            error
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSavedItems();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  const retrySavedItemsLoad = useCallback(() => {
    void refreshSavedItems({
      showLoading: true,
      clearExisting: savedItems.length === 0,
    });
  }, [refreshSavedItems, savedItems.length]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const subscription =
      AppState.addEventListener(
        'change',
        (nextAppState) => {
          if (nextAppState === 'active') {
            void refreshSavedItems({
              showLoading: false,
            });
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [userId, refreshSavedItems]);

  const savedItemKeys = useMemo(
    () =>
      new Set(
        savedItems.map((savedItem) =>
          getSavedItemKey(
            savedItem.category,
            savedItem.item.id
          )
        )
      ),
    [savedItems]
  );

  const isSaved = useCallback(
    (
      category: CategoryId,
      itemId: string
    ) =>
      savedItemKeys.has(
        getSavedItemKey(category, itemId)
      ),
    [savedItemKeys]
  );

  const saveItem = useCallback(
    (
      category: CategoryId,
      item: Top3Item,
      source?: SaveItemSource
    ) => {
      if (!userId || !item.id) {
        return;
      }

      const currentUserId = userId;
      const itemKey = getSavedItemKey(
        category,
        item.id
      );
      const pendingItemKey =
        getPendingSavedItemKey(
          currentUserId,
          category,
          item.id
        );

      if (
        savedItemKeys.has(itemKey) ||
        pendingItemKeysRef.current.has(
          pendingItemKey
        )
      ) {
        return;
      }

      const createdAt =
        new Date().toISOString();

      const optimisticSavedItem: SavedItem = {
        id: `optimistic:${itemKey}`,
        userId: currentUserId,
        category,
        item,
        sourceCollectionId:
          source?.collectionId,
        sourceUserId: source?.userId,
        sourceTopic: source?.topic,
        createdAt,
      };

      mutationVersionRef.current += 1;
      pendingItemKeysRef.current.add(
        pendingItemKey
      );

      setSavedItems((currentItems) => [
        optimisticSavedItem,
        ...currentItems,
      ]);

      async function persistSavedItem() {
        try {
          await createSavedItem(
            currentUserId,
            category,
            item,
            source
          );

          trackAnalyticsEvent(
            'saved_item_added'
          );
        } catch (error) {
          console.error(
            'Failed to save item:',
            error
          );

          if (
            activeUserIdRef.current ===
            currentUserId
          ) {
            setSavedItems((currentItems) =>
              currentItems.filter(
                (savedItem) =>
                  getSavedItemKey(
                    savedItem.category,
                    savedItem.item.id
                  ) !== itemKey
              )
            );
          }
        } finally {
          pendingItemKeysRef.current.delete(
            pendingItemKey
          );
        }
      }

      void persistSavedItem();
    },
    [userId, savedItemKeys]
  );

  const unsaveItem = useCallback(
    (
      category: CategoryId,
      itemId: string
    ) => {
      if (!userId || !itemId) {
        return;
      }

      const currentUserId = userId;
      const itemKey = getSavedItemKey(
        category,
        itemId
      );
      const pendingItemKey =
        getPendingSavedItemKey(
          currentUserId,
          category,
          itemId
        );

      if (
        !savedItemKeys.has(itemKey) ||
        pendingItemKeysRef.current.has(
          pendingItemKey
        )
      ) {
        return;
      }

      const removedItem = savedItems.find(
        (savedItem) =>
          getSavedItemKey(
            savedItem.category,
            savedItem.item.id
          ) === itemKey
      );

      if (!removedItem) {
        return;
      }

      const itemToRestore = removedItem;

      mutationVersionRef.current += 1;
      pendingItemKeysRef.current.add(
        pendingItemKey
      );

      setSavedItems((currentItems) =>
        currentItems.filter(
          (savedItem) =>
            getSavedItemKey(
              savedItem.category,
              savedItem.item.id
            ) !== itemKey
        )
      );

      async function removeSavedItem() {
        try {
          await deleteSavedItem(
            currentUserId,
            category,
            itemId
          );

          trackAnalyticsEvent(
            'saved_item_removed'
          );
        } catch (error) {
          console.error(
            'Failed to delete saved item:',
            error
          );

          if (
            activeUserIdRef.current ===
            currentUserId
          ) {
            setSavedItems((currentItems) => {
              const alreadyRestored =
                currentItems.some(
                  (savedItem) =>
                    getSavedItemKey(
                      savedItem.category,
                      savedItem.item.id
                    ) === itemKey
                );

              if (alreadyRestored) {
                return currentItems;
              }

              return [
                itemToRestore,
                ...currentItems,
              ].sort(
                (a, b) =>
                  new Date(
                    b.createdAt
                  ).getTime() -
                  new Date(
                    a.createdAt
                  ).getTime()
              );
            });
          }
        } finally {
          pendingItemKeysRef.current.delete(
            pendingItemKey
          );
        }
      }

      void removeSavedItem();
    },
    [userId, savedItems, savedItemKeys]
  );

  const toggleSavedItem = useCallback(
    (
      category: CategoryId,
      item: Top3Item,
      source?: SaveItemSource
    ) => {
      if (!userId || !item.id) {
        return;
      }

      const pendingItemKey =
        getPendingSavedItemKey(
          userId,
          category,
          item.id
        );

      if (
        pendingItemKeysRef.current.has(
          pendingItemKey
        )
      ) {
        return;
      }

      if (isSaved(category, item.id)) {
        unsaveItem(category, item.id);
        return;
      }

      saveItem(category, item, source);
    },
    [userId, isSaved, saveItem, unsaveItem]
  );

  const value = useMemo(
    () => ({
      savedItems,
      isLoading,
      hasLoadError,
      retrySavedItemsLoad,
      isSaved,
      saveItem,
      unsaveItem,
      toggleSavedItem,
    }),
    [
      savedItems,
      isLoading,
      hasLoadError,
      retrySavedItemsLoad,
      isSaved,
      saveItem,
      unsaveItem,
      toggleSavedItem,
    ]
  );

  return (
    <SavedItemsContext.Provider
      value={value}>
      {children}
    </SavedItemsContext.Provider>
  );
}

export function useSavedItems() {
  const context = useContext(
    SavedItemsContext
  );

  if (!context) {
    throw new Error(
      'useSavedItems must be used inside a SavedItemsProvider'
    );
  }

  return context;
}
