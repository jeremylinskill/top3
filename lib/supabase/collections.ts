import { supabase } from '@/lib/supabase';
import { Post } from '@/types/post';
import { Top3Item } from '@/types/top3-item';
import { Top3List } from '@/types/top3-list';

type CollectionStatus = 'draft' | 'published';

type CollectionRow = {
  id: string;
  user_id: string;
  category: string;
  topic: string | null;
  title: string;
  status: CollectionStatus;
  items: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type CreateCollectionInput = {
  userId: string;
  category: string;
  topic?: string;
  title: string;
  items?: Top3List['items'];
};

type UpdateCollectionInput = {
  category?: string;
  topic?: string;
  title?: string;
  items?: Top3List['items'];
};

export type CollectionSummary = {
  id: string;
  title: string;
};

function normalizeItems(
  items: unknown
): Top3List['items'] {
  if (!Array.isArray(items)) {
    return [null, null, null];
  }

  const normalizedItems = items
    .slice(0, 3)
    .map((item): Top3Item | null => {
      if (
        !item ||
        typeof item !== 'object' ||
        !('id' in item) ||
        !('title' in item) ||
        typeof item.id !== 'string' ||
        typeof item.title !== 'string'
      ) {
        return null;
      }

      return item as Top3Item;
    });

  while (normalizedItems.length < 3) {
    normalizedItems.push(null);
  }

  return normalizedItems as Top3List['items'];
}

function mapCollectionRow(
  row: CollectionRow
): Top3List {
  return {
    id: row.id,
    category: row.category,
    topic: row.topic ?? undefined,
    title: row.title,
    items: normalizeItems(row.items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt:
      row.published_at ?? undefined,
  };
}

function mapPublishedCollectionRowToPost(
  row: CollectionRow
): Post {
  const collection = mapCollectionRow(row);

  return {
    id: `post-${collection.id}`,
    authorId: row.user_id,
    collection,
    publishedAt: row.published_at!,
    reactions: 0,
    comments: 0,
  };
}

export async function getCollections(
  userId: string
): Promise<Top3List[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Failed to load collections: ${error.message}`
    );
  }

  return (data as CollectionRow[]).map(
    mapCollectionRow
  );
}

export async function getPublishedPosts(): Promise<
  Post[]
> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Failed to load published posts: ${error.message}`
    );
  }

  return (data as CollectionRow[]).map(
    mapPublishedCollectionRowToPost
  );
}

export async function getPublishedPostsByUser(
  userId: string
): Promise<Post[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Failed to load published posts: ${error.message}`
    );
  }

  return (data as CollectionRow[]).map(
    mapPublishedCollectionRowToPost
  );
}

export async function getCollectionsByIds(
  collectionIds: string[]
): Promise<CollectionSummary[]> {
  const uniqueCollectionIds = Array.from(
    new Set(
      collectionIds
        .map((collectionId) =>
          collectionId.trim()
        )
        .filter(Boolean)
    )
  );

  if (uniqueCollectionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('collections')
    .select(
      `
        id,
        title
      `
    )
    .in('id', uniqueCollectionIds);

  if (error) {
    throw new Error(
      `Failed to load collection summaries: ${error.message}`
    );
  }

  return (
    data as CollectionSummary[]
  ) ?? [];
}

export async function createCollection(
  input: CreateCollectionInput
): Promise<Top3List> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: input.userId,
      category: input.category,
      topic: input.topic ?? null,
      title: input.title,
      status: 'draft',
      items:
        input.items ?? [null, null, null],
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to create collection: ${error.message}`
    );
  }

  return mapCollectionRow(
    data as CollectionRow
  );
}

export async function updateCollection(
  collectionId: string,
  input: UpdateCollectionInput
): Promise<Top3List> {
  const updates: {
    category?: string;
    topic?: string | null;
    title?: string;
    items?: Top3List['items'];
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.category !== undefined) {
    updates.category = input.category;
  }

  if (input.topic !== undefined) {
    updates.topic = input.topic || null;
  }

  if (input.title !== undefined) {
    updates.title = input.title;
  }

  if (input.items !== undefined) {
    updates.items = input.items;
  }

  const { data, error } = await supabase
    .from('collections')
    .update(updates)
    .eq('id', collectionId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to update collection: ${error.message}`
    );
  }

  return mapCollectionRow(
    data as CollectionRow
  );
}

export async function publishCollection(
  collectionId: string
): Promise<Top3List> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('collections')
    .update({
      status: 'published',
      published_at: now,
      updated_at: now,
    })
    .eq('id', collectionId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to publish collection: ${error.message}`
    );
  }

  return mapCollectionRow(
    data as CollectionRow
  );
}

export async function deleteCollection(
  collectionId: string
): Promise<void> {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId);

  if (error) {
    throw new Error(
      `Failed to delete collection: ${error.message}`
    );
  }
}