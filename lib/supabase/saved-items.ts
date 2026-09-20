import { CategoryId } from '@/constants/top3-categories';
import { supabase } from '@/lib/supabase';
import { Top3Item } from '@/types/top3-item';

export type SavedItem = {
  id: string;
  userId: string;
  category: CategoryId;
  item: Top3Item;
  sourceCollectionId?: string;
  sourceUserId?: string;
  createdAt: string;
};

export type SaveItemSource = {
  collectionId?: string;
  userId?: string;
};

type SavedItemRow = {
  id: string;
  user_id: string;
  category: CategoryId;
  item_id: string;
  item_snapshot: Top3Item;
  source_collection_id: string | null;
  source_user_id: string | null;
  created_at: string;
};

function isUuid(value?: string): value is string {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function mapSavedItemRow(
  row: SavedItemRow
): SavedItem {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    item: row.item_snapshot,
    sourceCollectionId:
      row.source_collection_id ?? undefined,
    sourceUserId: row.source_user_id ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getSavedItems(
  userId: string
): Promise<SavedItem[]> {
  const { data, error } = await supabase
    .from('saved_items')
    .select(
      [
        'id',
        'user_id',
        'category',
        'item_id',
        'item_snapshot',
        'source_collection_id',
        'source_user_id',
        'created_at',
      ].join(', ')
    )
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false,
    })
    .returns<SavedItemRow[]>();

  if (error) {
    throw new Error(
      `Failed to load saved items: ${error.message}`
    );
  }

  return (data ?? []).map(mapSavedItemRow);
}

export async function saveItem(
  userId: string,
  category: CategoryId,
  item: Top3Item,
  source?: SaveItemSource
): Promise<void> {
  const row: {
    user_id: string;
    category: CategoryId;
    item_id: string;
    item_snapshot: Top3Item;
    source_collection_id?: string;
    source_user_id?: string;
  } = {
    user_id: userId,
    category,
    item_id: item.id,
    item_snapshot: item,
  };

  if (isUuid(source?.collectionId)) {
    row.source_collection_id =
      source.collectionId;
  }

  if (isUuid(source?.userId)) {
    row.source_user_id = source.userId;
  }

  const { error } = await supabase
    .from('saved_items')
    .upsert(row, {
      onConflict: 'user_id,category,item_id',
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(
      `Failed to save item: ${error.message}`
    );
  }
}

export async function deleteSavedItem(
  userId: string,
  category: CategoryId,
  itemId: string
): Promise<void> {
  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('user_id', userId)
    .eq('category', category)
    .eq('item_id', itemId);

  if (error) {
    throw new Error(
      `Failed to delete saved item: ${error.message}`
    );
  }
}
