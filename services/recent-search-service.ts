import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_STORAGE_KEY =
  '@top3/recent-searches';

const MAX_RECENT_SEARCHES = 10;

function normalizeSearch(value: string) {
  return value.trim();
}

export async function getRecentSearches(): Promise<
  string[]
> {
  try {
    const storedValue =
      await AsyncStorage.getItem(
        RECENT_SEARCHES_STORAGE_KEY
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
  search: string
): Promise<string[]> {
  const normalizedSearch =
    normalizeSearch(search);

  if (!normalizedSearch) {
    return getRecentSearches();
  }

  try {
    const existingSearches =
      await getRecentSearches();

    const nextSearches = [
      normalizedSearch,
      ...existingSearches.filter(
        (existingSearch) =>
          existingSearch.toLowerCase() !==
          normalizedSearch.toLowerCase()
      ),
    ].slice(0, MAX_RECENT_SEARCHES);

    await AsyncStorage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
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

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(
      RECENT_SEARCHES_STORAGE_KEY
    );
  } catch (error) {
    console.error(
      'Failed to clear recent searches:',
      error
    );
  }
}