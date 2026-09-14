import { supabase } from '@/lib/supabase';

type CommentLikeRow = {
  comment_id: string;
};

export async function getLikedCommentIds(
  userId: string,
  commentIds: string[]
): Promise<string[]> {
  const uniqueCommentIds = Array.from(
    new Set(
      commentIds.filter(
        (commentId) => commentId.length > 0
      )
    )
  );

  if (
    !userId ||
    uniqueCommentIds.length === 0
  ) {
    return [];
  }

  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', userId)
    .in('comment_id', uniqueCommentIds)
    .returns<CommentLikeRow[]>();

  if (error) {
    throw new Error(
      `Failed to load comment likes: ${error.message}`
    );
  }

  return (data ?? []).map(
    (like) => like.comment_id
  );
}

export async function createCommentLike(
  userId: string,
  commentId: string
): Promise<void> {
  const { error } = await supabase
    .from('comment_likes')
    .upsert(
      {
        user_id: userId,
        comment_id: commentId,
      },
      {
        onConflict: 'user_id,comment_id',
        ignoreDuplicates: true,
      }
    );

  if (error) {
    throw new Error(
      `Failed to like comment: ${error.message}`
    );
  }
}

export async function deleteCommentLike(
  userId: string,
  commentId: string
): Promise<void> {
  const { error } = await supabase
    .from('comment_likes')
    .delete()
    .eq('user_id', userId)
    .eq('comment_id', commentId);

  if (error) {
    throw new Error(
      `Failed to unlike comment: ${error.message}`
    );
  }
}
