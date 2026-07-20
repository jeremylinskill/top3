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
};

const Top3Context = createContext<Top3ContextValue | undefined>(undefined);

type Top3ProviderProps = {
  children: ReactNode;
};

const STORAGE_KEY = 'top3-lists';

const initialMovieList: Top3List = {
  id: 'movies-general',
  category: 'movies',
  title: 'Top 3 Movies',
  items: [null, null, null],
};

export function Top3Provider({ children }: Top3ProviderProps) {
  const [lists, setLists] = useState<Top3List[]>([initialMovieList]);
  const [currentListId, setCurrentListId] = useState(initialMovieList.id);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  const currentList = useMemo(
    () => lists.find((list) => list.id === currentListId) ?? null,
    [lists, currentListId]
  );

  useEffect(() => {
    async function loadSavedLists() {
      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);

        if (savedData) {
          const parsedData = JSON.parse(savedData) as {
            lists: Top3List[];
            currentListId: string;
          };

          if (parsedData.lists.length > 0) {
            setLists(parsedData.lists);
            setCurrentListId(parsedData.currentListId);
          }
        }
      } catch (error) {
        console.error('Failed to load saved collections:', error);
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
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            lists,
            currentListId,
          })
        );
      } catch (error) {
        console.error('Failed to save collections:', error);
      }
    }

    saveLists();
  }, [lists, currentListId, hasLoadedStorage]);

  function createList(input: CreateListInput) {
    const normalizedTopic = input.topic?.trim().toLowerCase() ?? '';

    const existingList = lists.find((list) => {
      const existingTopic = list.topic?.trim().toLowerCase() ?? '';

      return (
        list.category.toLowerCase() === input.category.toLowerCase() &&
        existingTopic === normalizedTopic
      );
    });

    if (existingList) {
      setCurrentListId(existingList.id);
      return null;
    }

    const id = `${input.category}-${normalizedTopic || 'general'}-${Date.now()}`;

    const newList: Top3List = {
      id,
      category: input.category,
      topic: input.topic,
      title: input.title,
      items: [null, null, null],
    };

    setLists((currentLists) => [...currentLists, newList]);
    setCurrentListId(id);

    return id;
  }

  function selectList(listId: string) {
    setCurrentListId(listId);
  }

  function setItemAtRank(rank: number, item: Top3Item) {
    if (!currentList || rank < 1 || rank > 3) {
      return;
    }

    setLists((currentLists) =>
      currentLists.map((list) => {
        if (list.id !== currentList.id) {
          return list;
        }

        const nextItems = [...list.items] as Top3List['items'];
        nextItems[rank - 1] = item;

        return {
          ...list,
          items: nextItems,
        };
      })
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
      }}>
      {children}
    </Top3Context.Provider>
  );
}

export function useTop3() {
  const context = useContext(Top3Context);

  if (!context) {
    throw new Error('useTop3 must be used inside a Top3Provider');
  }

  return context;
}