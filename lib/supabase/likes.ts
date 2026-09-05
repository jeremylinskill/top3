import { supabase } from '@/lib/supabase';

export type LikeCountsByCollectionId = Record<
  string,
  number
>;

export type LikeSnapshot = {
  likedCollectionIds: string[];
  likeCounts: LikeCountsByCollectionId;
};

type LikeRow = {
  user_id: string;
  collection_id: string;
};

export async function getLikeSnapshot(
  userId: string
): Promise<LikeSnapshot> {
  const { data, error } = await supabase
    .from('likes')
    .select('user_id, collection_id')
    .returns<LikeRow[]>();

  if (error) {
    throw new Error(
      `Failed to load likes: ${error.message}`
    );
  }

  const likedCollectionIds: string[] = [];
  const likeCounts: LikeCountsByCollectionId = {};

  (data ?? []).forEach((like) => {
    likeCounts[like.collection_id] =
      (likeCounts[like.collection_id] ?? 0) + 1;

    if (like.user_id === userId) {
      likedCollectionIds.push(
        like.collection_id
      );
    }
  });

  return {
    likedCollectionIds,
    likeCounts,
  };
}

export async function createLike(
  userId: string,
  collectionId: string
): Promise<void> {
  const { error } = await supabase
    .from('likes')
    .upsert(
      {
        user_id: userId,
        collection_id: collectionId,
      },
      {
        onConflict: 'user_id,collection_id',
        ignoreDuplicates: true,
      }
    );

  if (error) {
    throw new Error(
      `Failed to create like: ${error.message}`
    );
  }
}

export async function deleteLike(
  userId: string,
  collectionId: string
): Promise<void> {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('collection_id', collectionId);

  if (error) {
    throw new Error(
      `Failed to delete like: ${error.message}`
    );
  }
}