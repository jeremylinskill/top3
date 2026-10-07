import { BUNDLED_COLLECTION_OPTIONS } from '@/constants/collection-option-fallbacks';
import { CategoryId } from '@/constants/top3-categories';
import {
  fetchCollectionOptions,
  getCachedCollectionOptions,
} from '@/services/collection-option-service';
import {
  CollectionOption,
  CollectionOptionKind,
} from '@/types/collection-option';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type CollectionOptionsContextValue = {
  options: CollectionOption[];
  isRefreshing: boolean;
  getOptionById: (
    optionId?: string
  ) => CollectionOption | undefined;
  getOptionsForCategory: (
    categoryId: CategoryId,
    kind?: CollectionOptionKind
  ) => CollectionOption[];
  refreshOptions: () => Promise<void>;
};

type CollectionOptionsProviderProps = {
  children: ReactNode;
};

const CollectionOptionsContext =
  createContext<
    CollectionOptionsContextValue | undefined
  >(undefined);

function sortOptions(
  options: CollectionOption[]
) {
  return [...options].sort(
    (first, second) => {
      if (
        first.displayOrder !==
        second.displayOrder
      ) {
        return (
          first.displayOrder -
          second.displayOrder
        );
      }

      return first.name.localeCompare(
        second.name
      );
    }
  );
}

export function CollectionOptionsProvider({
  children,
}: CollectionOptionsProviderProps) {
  const [options, setOptions] = useState<
    CollectionOption[]
  >(
    sortOptions(
      BUNDLED_COLLECTION_OPTIONS
    )
  );

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const refreshOptions =
    useCallback(async () => {
      setIsRefreshing(true);

      try {
        const remoteOptions =
          await fetchCollectionOptions();

        setOptions(
          sortOptions(remoteOptions)
        );
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to refresh collection options:',
            error
          );
        }
      } finally {
        setIsRefreshing(false);
      }
    }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadOptions() {
      const cachedOptions =
        await getCachedCollectionOptions();

      if (
        !isCancelled &&
        cachedOptions.length > 0
      ) {
        setOptions(
          sortOptions(cachedOptions)
        );
      }

      try {
        const remoteOptions =
          await fetchCollectionOptions();

        if (!isCancelled) {
          setOptions(
            sortOptions(remoteOptions)
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load collection options:',
            error
          );
        }
      }
    }

    void loadOptions();

    return () => {
      isCancelled = true;
    };
  }, []);

  const getOptionById =
    useCallback(
      (optionId?: string) => {
        const normalizedOptionId =
          optionId
            ?.trim()
            .toLowerCase();

        if (!normalizedOptionId) {
          return undefined;
        }

        return options.find(
          (option) =>
            option.id
              .trim()
              .toLowerCase() ===
            normalizedOptionId
        );
      },
      [options]
    );

  const getOptionsForCategory =
    useCallback(
      (
        categoryId: CategoryId,
        kind?: CollectionOptionKind
      ) =>
        options.filter(
          (option) =>
            option.active &&
            option.categoryId ===
              categoryId &&
            (!kind ||
              option.kind === kind)
        ),
      [options]
    );

  const value =
    useMemo<CollectionOptionsContextValue>(
      () => ({
        options,
        isRefreshing,
        getOptionById,
        getOptionsForCategory,
        refreshOptions,
      }),
      [
        options,
        isRefreshing,
        getOptionById,
        getOptionsForCategory,
        refreshOptions,
      ]
    );

  return (
    <CollectionOptionsContext.Provider
      value={value}>
      {children}
    </CollectionOptionsContext.Provider>
  );
}

export function useCollectionOptions() {
  const context =
    useContext(CollectionOptionsContext);

  if (!context) {
    throw new Error(
      'useCollectionOptions must be used inside a CollectionOptionsProvider'
    );
  }

  return context;
}
