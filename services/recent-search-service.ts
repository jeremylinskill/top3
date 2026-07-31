import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_STORAGE_KEY =
  '@top3/recent-searches';

const MAX_RECENT_SEARCHES = 10;

function normalizeSearch(value: string) {
  return value.trim();
}

function getRecentSearchesStorageKey(
  userId: string
) {
  const normalizedUserId = userId.trim();

  return `${RECENT_SEARCHES_STORAGE_KEY}:${normalizedUserId}`;
}

export async function getRecentSearches(
  userId: string
): Promise<string[]> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return [];
  }

  try {
    const storedValue =
      await AsyncStorage.getItem(
        getRecentSearchesStorageKey(
          normalizedUserId
        )
      );

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (item): item is string =>
        typeof item === 'string' &&
        item.trim().length > 0
    );
  } catch (error) {
    console.error(
      'Failed to load recent searches:',
      error
    );

    return [];
  }
}

export async function saveRecentSearch(
  userId: string,
  search: string
): Promise<string[]> {
  const normalizedUserId = userId.trim();
  const normalizedSearch =
    normalizeSearch(search);

  if (!normalizedUserId) {
    return [];
  }

  if (!normalizedSearch) {
    return getRecentSearches(
      normalizedUserId
    );
  }

  try {
    const existingSearches =
      await getRecentSearches(
        normalizedUserId
      );

    const nextSearches = [
      normalizedSearch,
      ...existingSearches.filter(
        (existingSearch) =>
          existingSearch.toLowerCase() !==
          normalizedSearch.toLowerCase()
      ),
    ].slice(0, MAX_RECENT_SEARCHES);

    await AsyncStorage.setItem(
      getRecentSearchesStorageKey(
        normalizedUserId
      ),
      JSON.stringify(nextSearches)
    );

    return nextSearches;
  } catch (error) {
    console.error(
      'Failed to save recent search:',
      error
    );

    return [];
  }
}

export async function clearRecentSearches(
  userId: string
): Promise<void> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return;
  }

  try {
    await AsyncStorage.removeItem(
      getRecentSearchesStorageKey(
        normalizedUserId
      )
    );
  } catch (error) {
    console.error(
      'Failed to clear recent searches:',
      error
    );
  }
}