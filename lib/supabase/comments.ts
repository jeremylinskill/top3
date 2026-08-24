import { supabase } from '@/lib/supabase';

export type CommentRecord = {
  id: string;
  collectionId: string;
  userId: string;
  authorDisplayName: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type CommentProfileRow = {
  display_name: string | null;
  username: string | null;
};

type CommentRow = {
  id: string;
  collection_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles:
    | CommentProfileRow
    | CommentProfileRow[]
    | null;
};

type VisibleCommentCountRow = {
  collection_id: string;
  comment_count: number | string;
};

const COMMENT_SELECT = `
  id,
  collection_id,
  user_id,
  content,
  created_at,
  updated_at,
  profiles!comments_user_id_fkey (
    display_name,
    username
  )
`;

function getProfileFromRow(
  profiles: CommentRow['profiles']
): CommentProfileRow | null {
  if (Array.isArray(profiles)) {
    return profiles[0] ?? null;
  }

  return profiles;
}

function mapCommentRow(
  row: CommentRow
): CommentRecord {
  const profile = getProfileFromRow(
    row.profiles
  );

  return {
    id: row.id,
    collectionId: row.collection_id,
    userId: row.user_id,
    authorDisplayName:
      profile?.display_name ??
      'Top3 User',
    authorUsername:
      profile?.username ??
      'top3user',
    authorAvatarUrl: undefined,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllComments(): Promise<
  CommentRecord[]
> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .is('removed_at', null)
    .order('created_at', {
      ascending: true,
    })
    .returns<CommentRow[]>();

  if (error) {
    throw new Error(
      `Failed to load comments: ${error.message}`
    );
  }

  return (data ?? []).map(mapCommentRow);
}

export async function getCommentsForCollection(
  collectionId: string
): Promise<CommentRecord[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('collection_id', collectionId)
    .is('removed_at', null)
    .order('created_at', {
      ascending: true,
    })
    .returns<CommentRow[]>();

  if (error) {
    throw new Error(
      `Failed to load comments: ${error.message}`
    );
  }

  return (data ?? []).map(mapCommentRow);
}

export async function getCommentCounts(
  collectionIds: string[]
): Promise<Record<string, number>> {
  if (collectionIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase.rpc(
    'get_visible_comment_counts',
    {
      collection_ids: collectionIds,
    }
  );

  if (error) {
    throw new Error(
      `Failed to load comment counts: ${error.message}`
    );
  }

  return (
    (data as VisibleCommentCountRow[] | null) ??
    []
  ).reduce<Record<string, number>>(
    (counts, row) => {
      const normalizedCount =
        typeof row.comment_count === 'number'
          ? row.comment_count
          : Number(row.comment_count);

      counts[row.collection_id] =
        Number.isFinite(normalizedCount)
          ? normalizedCount
          : 0;

      return counts;
    },
    {}
  );
}

export async function createComment(
  userId: string,
  collectionId: string,
  content: string
): Promise<CommentRecord> {
  const normalizedContent =
    content.trim();

  if (!normalizedContent) {
    throw new Error(
      'Comment content cannot be empty.'
    );
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      user_id: userId,
      collection_id: collectionId,
      content: normalizedContent,
    })
    .select(COMMENT_SELECT)
    .single<CommentRow>();

  if (error) {
    throw new Error(
      `Failed to create comment: ${error.message}`
    );
  }

  return mapCommentRow(data);
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<CommentRecord> {
  const normalizedContent =
    content.trim();

  if (!normalizedContent) {
    throw new Error(
      'Comment content cannot be empty.'
    );
  }

  const { data, error } = await supabase
    .from('comments')
    .update({
      content: normalizedContent,
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', commentId)
    .is('removed_at', null)
    .select(COMMENT_SELECT)
    .single<CommentRow>();

  if (error) {
    throw new Error(
      `Failed to update comment: ${error.message}`
    );
  }

  return mapCommentRow(data);
}

export async function deleteComment(
  commentId: string
): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new Error(
      `Failed to delete comment: ${error.message}`
    );
  }
}