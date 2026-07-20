import { Top3Item } from '@/types/top3-item';
import { Top3List } from '@/types/top3-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

type Top3ContextValue = {
  currentList: Top3List;
  setItemAtRank: (rank: number, item: Top3Item) => void;
};

const Top3Context = createContext<Top3ContextValue | undefined>(undefined);

type Top3ProviderProps = {
  children: ReactNode;
};

const STORAGE_KEY = 'top3-current-list';

const initialList: Top3List = {
  id: 'movies-general',
  category: 'movies',
  title: 'Top 3 Movies',
  items: [null, null, null],
};

export function Top3Provider({ children }: Top3ProviderProps) {
  const [currentList, setCurrentList] = useState<Top3List>(initialList);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    async function loadSavedList() {
      try {
        const savedList = await AsyncStorage.getItem(STORAGE_KEY);

        if (savedList) {
          setCurrentList(JSON.parse(savedList));
        }
      } catch (error) {
        console.error('Failed to load saved Top 3 list:', error);
      } finally {
        setHasLoadedStorage(true);
      }
    }

    loadSavedList();
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) {
      return;
    }

    async function saveCurrentList() {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(currentList)
        );
      } catch (error) {
        console.error('Failed to save Top 3 list:', error);
      }
    }

    saveCurrentList();
  }, [currentList, hasLoadedStorage]);

  function setItemAtRank(rank: number, item: Top3Item) {
    if (rank < 1 || rank > 3) {
      throw new Error('Rank must be 1, 2, or 3');
    }

    setCurrentList((list) => {
      const nextItems = [...list.items] as Top3List['items'];
      nextItems[rank - 1] = item;

      return {
        ...list,
        items: nextItems,
      };
    });
  }

  return (
    <Top3Context.Provider value={{ currentList, setItemAtRank }}>
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