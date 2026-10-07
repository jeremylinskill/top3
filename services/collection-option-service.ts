import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import {
  CollectionOption,
  CollectionOptionKind,
  CollectionOptionSuggestion,
} from '@/types/collection-option';
import { Top3Item } from '@/types/top3-item';

const COLLECTION_OPTIONS_STORAGE_KEY =
  '@top3/collection-options:v1';

const COLLECTION_OPTION_SUGGESTIONS_STORAGE_PREFIX =
  '@top3/collection-option-suggestions:v1';

type CollectionOptionRow = {
  id: string;
  slug: string;
  category_id: CollectionOption['categoryId'];
  kind: CollectionOptionKind;
  name: string;
  group_name: string | null;
  browse_label: string | null;
  keywords: string[];
  search_hints: string[];
  featured: boolean;
  trending_enabled: boolean;
  active: boolean;
  display_order: number;
  entity_kind: string | null;
  provider_key: string | null;
  provider_mode: string | null;
  provider_config: Record<string, unknown>;
};

type CollectionOptionSuggestionRow = {
  id: number;
  option_id: string;
  item_id: string;
  item: Top3Item;
  display_order: number;
  active: boolean;
};

function mapCollectionOptionRow(
  row: CollectionOptionRow
): CollectionOption {
  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.category_id,
    kind: row.kind,
    name: row.name,
    groupName:
      row.group_name ?? undefined,
    browseLabel:
      row.browse_label ?? undefined,
    keywords: row.keywords ?? [],
    searchHints: row.search_hints ?? [],
    featured: row.featured,
    trendingEnabled: row.trending_enabled,
    active: row.active,
    displayOrder: row.display_order,
    entityKind:
      row.entity_kind ?? undefined,
    providerKey:
      row.provider_key ?? undefined,
    providerMode:
      row.provider_mode ?? undefined,
    providerConfig:
      row.provider_config ?? {},
  };
}

function mapCollectionOptionSuggestionRow(
  row: CollectionOptionSuggestionRow
): CollectionOptionSuggestion {
  return {
    id: row.id,
    optionId: row.option_id,
    itemId: row.item_id,
    item: row.item,
    displayOrder: row.display_order,
    active: row.active,
  };
}

function getSuggestionStorageKey(
  optionId: string
) {
  return `${COLLECTION_OPTION_SUGGESTIONS_STORAGE_PREFIX}:${optionId}`;
}

export async function getCachedCollectionOptions(): Promise<
  CollectionOption[]
> {
  try {
    const storedValue =
      await AsyncStorage.getItem(
        COLLECTION_OPTIONS_STORAGE_KEY
      );

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? (parsedValue as CollectionOption[])
      : [];
  } catch (error) {
    if (__DEV__) {
      console.log(
        'Failed to load cached collection options:',
        error
      );
    }

    return [];
  }
}

export async function fetchCollectionOptions(): Promise<
  CollectionOption[]
> {
  const { data, error } = await supabase
    .from('collection_options')
    .select(
      `
        id,
        slug,
        category_id,
        kind,
        name,
        group_name,
        browse_label,
        keywords,
        search_hints,
        featured,
        trending_enabled,
        active,
        display_order,
        entity_kind,
        provider_key,
        provider_mode,
        provider_config
      `
    )
    .order('category_id', {
      ascending: true,
    })
    .order('kind', {
      ascending: true,
    })
    .order('display_order', {
      ascending: true,
    })
    .order('name', {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Failed to load collection options: ${error.message}`
    );
  }

  const options = (
    (data ?? []) as CollectionOptionRow[]
  ).map(mapCollectionOptionRow);

  try {
    await AsyncStorage.setItem(
      COLLECTION_OPTIONS_STORAGE_KEY,
      JSON.stringify(options)
    );
  } catch (error) {
    if (__DEV__) {
      console.log(
        'Failed to cache collection options:',
        error
      );
    }
  }

  return options;
}

export async function getCachedCollectionOptionSuggestions(
  optionId: string
): Promise<CollectionOptionSuggestion[]> {
  const normalizedOptionId =
    optionId.trim();

  if (!normalizedOptionId) {
    return [];
  }

  try {
    const storedValue =
      await AsyncStorage.getItem(
        getSuggestionStorageKey(
          normalizedOptionId
        )
      );

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? (parsedValue as CollectionOptionSuggestion[])
      : [];
  } catch (error) {
    if (__DEV__) {
      console.log(
        'Failed to load cached collection option suggestions:',
        error
      );
    }

    return [];
  }
}

export async function fetchCollectionOptionSuggestions(
  optionId: string
): Promise<CollectionOptionSuggestion[]> {
  const normalizedOptionId =
    optionId.trim();

  if (!normalizedOptionId) {
    return [];
  }

  const { data, error } = await supabase
    .from('collection_option_suggestions')
    .select(
      `
        id,
        option_id,
        item_id,
        item,
        display_order,
        active
      `
    )
    .eq(
      'option_id',
      normalizedOptionId
    )
    .eq('active', true)
    .order('display_order', {
      ascending: true,
    })
    .order('id', {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Failed to load collection option suggestions: ${error.message}`
    );
  }

  const suggestions = (
    (data ?? []) as CollectionOptionSuggestionRow[]
  ).map(
    mapCollectionOptionSuggestionRow
  );

  try {
    await AsyncStorage.setItem(
      getSuggestionStorageKey(
        normalizedOptionId
      ),
      JSON.stringify(suggestions)
    );
  } catch (error) {
    if (__DEV__) {
      console.log(
        'Failed to cache collection option suggestions:',
        error
      );
    }
  }

  return suggestions;
}
