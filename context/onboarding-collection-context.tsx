import { Top3Item } from '@/types/top3-item';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type OnboardingCollection = {
  category: string;
  type?: string;
  topic?: string;
  title: string;
  items: [
    Top3Item | null,
    Top3Item | null,
    Top3Item | null,
  ];
};

export type OnboardingAuthIntent =
  | 'sign-in'
  | 'sign-up'
  | null;

type StartOnboardingCollectionInput = {
  category: string;
  type?: string;
  topic?: string;
  title: string;
};

type OnboardingCollectionContextValue = {
  collection: OnboardingCollection | null;
  isLoading: boolean;
  isPendingPublish: boolean;
  authIntent: OnboardingAuthIntent;
  startCollection: (
    input: StartOnboardingCollectionInput
  ) => void;
  setItemAtRank: (
    rank: number,
    item: Top3Item
  ) => void;
  removeItemAtRank: (rank: number) => void;
  setItems: (
    items: OnboardingCollection['items']
  ) => void;
  markPendingPublish: () => void;
  clearPendingPublish: () => void;
  setAuthIntent: (
    intent: OnboardingAuthIntent
  ) => void;
  prepareAuthHandoff: (
    intent: Exclude<OnboardingAuthIntent, null>
  ) => Promise<void>;
  clearAuthIntent: () => void;
  clearCollection: () => void;
};

type OnboardingCollectionProviderProps = {
  children: ReactNode;
};

const STORAGE_KEY =
  'top3-onboarding-collection-v1';

const PENDING_PUBLISH_STORAGE_KEY =
  'top3-onboarding-pending-publish-v1';

const AUTH_INTENT_STORAGE_KEY =
  'top3-onboarding-auth-intent-v1';

const OnboardingCollectionContext =
  createContext<
    OnboardingCollectionContextValue | undefined
  >(undefined);

export function OnboardingCollectionProvider({
  children,
}: OnboardingCollectionProviderProps) {
  const [collection, setCollection] =
    useState<OnboardingCollection | null>(
      null
    );

  const [
    isPendingPublish,
    setIsPendingPublish,
  ] = useState(false);

  const [
    authIntent,
    setAuthIntentState,
  ] = useState<OnboardingAuthIntent>(
    null
  );

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadOnboardingState() {
      try {
        const [
          storedCollectionValue,
          storedPendingPublishValue,
          storedAuthIntentValue,
        ] = await Promise.all([
          AsyncStorage.getItem(
            STORAGE_KEY
          ),
          AsyncStorage.getItem(
            PENDING_PUBLISH_STORAGE_KEY
          ),
          AsyncStorage.getItem(
            AUTH_INTENT_STORAGE_KEY
          ),
        ]);

        if (isCancelled) {
          return;
        }

        const hasPersistedAuthHandoff =
          Boolean(storedCollectionValue) &&
          storedPendingPublishValue === 'true' &&
          (
            storedAuthIntentValue === 'sign-in' ||
            storedAuthIntentValue === 'sign-up'
          );

        if (!hasPersistedAuthHandoff) {
          await AsyncStorage.multiRemove([
            STORAGE_KEY,
            PENDING_PUBLISH_STORAGE_KEY,
            AUTH_INTENT_STORAGE_KEY,
          ]);

          return;
        }

        const storedCollection =
          JSON.parse(
            storedCollectionValue as string
          ) as OnboardingCollection;

        setCollection(storedCollection);
        setIsPendingPublish(true);
        setAuthIntentState(
          storedAuthIntentValue as Exclude<
            OnboardingAuthIntent,
            null
          >
        );
      } catch (error) {
        console.error(
          'Failed to load onboarding collection state:',
          error
        );

        try {
          await AsyncStorage.multiRemove([
            STORAGE_KEY,
            PENDING_PUBLISH_STORAGE_KEY,
            AUTH_INTENT_STORAGE_KEY,
          ]);
        } catch (cleanupError) {
          console.error(
            'Failed to clear invalid onboarding collection state:',
            cleanupError
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOnboardingState();

    return () => {
      isCancelled = true;
    };
  }, []);

  function startCollection(
    input: StartOnboardingCollectionInput
  ) {
    setIsPendingPublish(false);
    setAuthIntentState(null);

    setCollection({
      category: input.category,
      type: input.type,
      topic: input.topic,
      title: input.title,
      items: [null, null, null],
    });
  }

  function setItemAtRank(
    rank: number,
    item: Top3Item
  ) {
    if (
      rank < 1 ||
      rank > 3
    ) {
      return;
    }

    setIsPendingPublish(false);
    setAuthIntentState(null);

    setCollection(
      (currentCollection) => {
        if (!currentCollection) {
          return currentCollection;
        }

        const nextItems = [
          ...currentCollection.items,
        ] as OnboardingCollection['items'];

        nextItems[rank - 1] = item;

        return {
          ...currentCollection,
          items: nextItems,
        };
      }
    );
  }

  function removeItemAtRank(
    rank: number
  ) {
    if (
      rank < 1 ||
      rank > 3
    ) {
      return;
    }

    setIsPendingPublish(false);
    setAuthIntentState(null);

    setCollection(
      (currentCollection) => {
        if (!currentCollection) {
          return currentCollection;
        }

        const remainingItems =
          currentCollection.items.filter(
            (
              item,
              index
            ): item is Top3Item =>
              item !== null &&
              index !== rank - 1
          );

        const nextItems = [
          ...remainingItems,
          ...Array(
            3 - remainingItems.length
          ).fill(null),
        ] as OnboardingCollection['items'];

        return {
          ...currentCollection,
          items: nextItems,
        };
      }
    );
  }

  function setItems(
    items: OnboardingCollection['items']
  ) {
    setIsPendingPublish(false);
    setAuthIntentState(null);

    setCollection(
      (currentCollection) => {
        if (!currentCollection) {
          return currentCollection;
        }

        return {
          ...currentCollection,
          items,
        };
      }
    );
  }

  function markPendingPublish() {
    if (!collection) {
      return;
    }

    setIsPendingPublish(true);
  }

  function clearPendingPublish() {
    setIsPendingPublish(false);

    void AsyncStorage.removeItem(
      PENDING_PUBLISH_STORAGE_KEY
    );
  }

  function setAuthIntent(
    intent: OnboardingAuthIntent
  ) {
    setAuthIntentState(intent);
  }

  async function prepareAuthHandoff(
    intent: Exclude<OnboardingAuthIntent, null>
  ) {
    if (!collection) {
      throw new Error(
        'No onboarding collection is available to save.'
      );
    }

    await AsyncStorage.multiSet([
      [
        STORAGE_KEY,
        JSON.stringify(collection),
      ],
      [
        PENDING_PUBLISH_STORAGE_KEY,
        'true',
      ],
      [
        AUTH_INTENT_STORAGE_KEY,
        intent,
      ],
    ]);

    setIsPendingPublish(true);
    setAuthIntentState(intent);
  }

  function clearAuthIntent() {
    setAuthIntentState(null);

    void AsyncStorage.removeItem(
      AUTH_INTENT_STORAGE_KEY
    );
  }

  function clearCollection() {
    setIsPendingPublish(false);
    setAuthIntentState(null);
    setCollection(null);

    void AsyncStorage.multiRemove([
      STORAGE_KEY,
      PENDING_PUBLISH_STORAGE_KEY,
      AUTH_INTENT_STORAGE_KEY,
    ]);
  }

  const value =
    useMemo<OnboardingCollectionContextValue>(
      () => ({
        collection,
        isLoading,
        isPendingPublish,
        authIntent,
        startCollection,
        setItemAtRank,
        removeItemAtRank,
        setItems,
        markPendingPublish,
        clearPendingPublish,
        setAuthIntent,
        prepareAuthHandoff,
        clearAuthIntent,
        clearCollection,
      }),
      [
        authIntent,
        collection,
        isLoading,
        isPendingPublish,
      ]
    );

  return (
    <OnboardingCollectionContext.Provider
      value={value}>
      {children}
    </OnboardingCollectionContext.Provider>
  );
}

export function useOnboardingCollection() {
  const context = useContext(
    OnboardingCollectionContext
  );

  if (!context) {
    throw new Error(
      'useOnboardingCollection must be used inside an OnboardingCollectionProvider'
    );
  }

  return context;
}