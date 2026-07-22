import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { Top3Item } from '@/types/top3-item';
import { Top3List } from '@/types/top3-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  currentList: Top3List | null;
  createList: (input: CreateListInput) => string | null;
  selectList: (listId: string) => void;
  setItemAtRank: (rank: number, item: Top3Item) => void;
  removeItemAtRank: (rank: number) => void;
  setItems: (items: Top3List['items']) => void;
};

type Top3ProviderProps = {
  children: ReactNode;
};

type StoredTop3Data = {
  lists: Top3List[];
  currentListId: string;
};

const Top3Context =
  createContext<Top3ContextValue | undefined>(undefined);

const STORAGE_KEY = 'top3-lists';

function createDefaultLists(): Top3List[] {
  const now = new Date().toISOString();

  return TOP3_CATEGORIES.map((category) => ({
    id: `${category.id}-general`,
    category: category.id,
    title: `Top 3 ${category.name}`,
    items: [null, null, null],
    createdAt: now,
    updatedAt: now,
  }));
}

function getListIdentity(
  list: Pick<Top3List, 'category' | 'topic'>
) {
  const category = list.category.trim().toLowerCase();
  const topic =
    list.topic?.trim().toLowerCase() ?? 'general';

  return `${category}:${topic}`;
}

function mergeDefaultLists(savedLists: Top3List[]) {
  const defaultLists = createDefaultLists();

  const existingIdentities = new Set(
    savedLists.map(getListIdentity)
  );

  const missingDefaults = defaultLists.filter(
    (defaultList) =>
      !existingIdentities.has(
        getListIdentity(defaultList)
      )
  );

  return [...savedLists, ...missingDefaults];
}

const defaultLists = createDefaultLists();
const firstDefaultListId = defaultLists[0]?.id ?? '';

export function Top3Provider({
  children,
}: Top3ProviderProps) {
  const [lists, setLists] =
    useState<Top3List[]>(defaultLists);

  const [currentListId, setCurrentListId] =
    useState<string>(firstDefaultListId);

  const [hasLoadedStorage, setHasLoadedStorage] =
    useState(false);

  const currentList = useMemo(
    () =>
      lists.find(
        (list) => list.id === currentListId
      ) ?? null,
    [lists, currentListId]
  );

  useEffect(() => {
    async function loadSavedLists() {
      try {
        const savedData =
          await AsyncStorage.getItem(STORAGE_KEY);

        if (!savedData) {
          return;
        }

        const parsedData =
          JSON.parse(savedData) as StoredTop3Data;

        const savedLists = Array.isArray(
          parsedData.lists
        )
          ? parsedData.lists
          : [];

        const nextLists =
          mergeDefaultLists(savedLists);

        setLists(nextLists);

        const savedCurrentListStillExists =
          nextLists.some(
            (list) =>
              list.id === parsedData.currentListId
          );

        setCurrentListId(
          savedCurrentListStillExists
            ? parsedData.currentListId
            : nextLists[0]?.id ??
                firstDefaultListId
        );
      } catch (error) {
        console.error(
          'Failed to load saved collections:',
          error
        );
      } finally {
        setHasLoadedStorage(true);
      }
    }

    loadSavedLists();
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) {
      return;
    }

    async function saveLists() {
      try {
        const data: StoredTop3Data = {
          lists,
          currentListId,
        };

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(data)
        );
      } catch (error) {
        console.error(
          'Failed to save collections:',
          error
        );
      }
    }

    saveLists();
  }, [
    lists,
    currentListId,
    hasLoadedStorage,
  ]);

  function createList(input: CreateListInput) {
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
        existingCategory === normalizedCategory &&
        existingTopic === normalizedTopic
      );
    });

    if (existingList) {
      setCurrentListId(existingList.id);
      return null;
    }

    const now = new Date().toISOString();

    const id =
      `${normalizedCategory}-` +
      `${normalizedTopic}-` +
      `${Date.now()}`;

    const newList: Top3List = {
      id,
      category: input.category,
      topic: input.topic,
      title: input.title,
      items: [null, null, null],
      createdAt: now,
      updatedAt: now,
    };

    setLists((currentLists) => [
      ...currentLists,
      newList,
    ]);

    setCurrentListId(id);

    return id;
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

    const now = new Date().toISOString();

    setLists((currentLists) =>
      currentLists.map((list) => {
        if (list.id !== currentList.id) {
          return list;
        }

        const nextItems = [
          ...list.items,
        ] as Top3List['items'];

        nextItems[rank - 1] = item;

        return {
          ...list,
          items: nextItems,
          updatedAt: now,
        };
      })
    );
  }

  function removeItemAtRank(rank: number) {
    if (
      !currentList ||
      rank < 1 ||
      rank > 3
    ) {
      return;
    }

    const now = new Date().toISOString();

    setLists((currentLists) =>
      currentLists.map((list) => {
        if (list.id !== currentList.id) {
          return list;
        }

        const remainingItems = list.items.filter(
          (item, index): item is Top3Item =>
            item !== null && index !== rank - 1
        );

        const nextItems = [
          ...remainingItems,
          ...Array(
            3 - remainingItems.length
          ).fill(null),
        ] as Top3List['items'];

        return {
          ...list,
          items: nextItems,
          updatedAt: now,
        };
      })
    );
  }

  function setItems(
    items: Top3List['items']
  ) {
    if (!currentList) {
      return;
    }

    const now = new Date().toISOString();

    setLists((currentLists) =>
      currentLists.map((list) =>
        list.id === currentList.id
          ? {
              ...list,
              items,
              updatedAt: now,
            }
          : list
      )
    );
  }

  return (
    <Top3Context.Provider
      value={{
        lists,
        currentList,
        createList,
        selectList,
        setItemAtRank,
        removeItemAtRank,
        setItems,
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