import { supabase } from '@/lib/supabase';
import type { CommentRecord } from '@/lib/supabase/comments';

/** A category/type/topic-wide Overall ranking, not an individual collection UUID. */
export function isCommunityRankingId(id: string | null | undefined): boolean {
  return Boolean(id && id.startsWith('community-'));
}

type CommunityLikeSnapshotRow = { ranking_key: string; like_count: number; liked_by_me: boolean };
type CommunityCommentLikeRow = { comment_id: string };
type Profile = { display_name: string | null; username: string | null; avatar_url: string | null };
type ReplyProfile = { display_name: string | null; username: string | null };
type CommunityCommentRow = {
  id: string;
  ranking_key: string;
  user_id: string;
  content: string;
  reply_to_comment_id: string | null;
  reply_to_user_id: string | null;
  created_at: string;
  updated_at: string;
  profiles: Profile | Profile[] | null;
  reply_to_profile: ReplyProfile | ReplyProfile[] | null;
};

const COMMUNITY_COMMENT_SELECT = `
  id, ranking_key, user_id, content, reply_to_comment_id, reply_to_user_id,
  created_at, updated_at,
  profiles!community_ranking_comments_user_id_fkey (display_name, username, avatar_url),
  reply_to_profile:profiles!community_ranking_comments_reply_to_user_id_fkey (display_name, username)
`;
function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
function mapComment(row: CommunityCommentRow): CommentRecord {
  const author = first(row.profiles);
  const reply = first(row.reply_to_profile);
  return {
    id: row.id,
    collectionId: row.ranking_key,
    userId: row.user_id,
    authorDisplayName: author?.display_name ?? 'Top3 User',
    authorUsername: author?.username ?? 'top3user',
    authorAvatarUrl: author?.avatar_url ?? undefined,
    content: row.content,
    replyToCommentId: row.reply_to_comment_id ?? undefined,
    replyToUserId: row.reply_to_user_id ?? undefined,
    replyToDisplayName: reply?.display_name ?? undefined,
    replyToUsername: reply?.username ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCommunityLikeSnapshot() {
  const likedCollectionIds: string[] = [];
  const likeCounts: Record<string, number> = {};
  // Server calculates the totals and whether the authenticated viewer liked each
  // ranking. Paging applies to ranking groups, not the underlying Like records.
  const pageSize = 500;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .rpc('get_community_ranking_like_snapshot')
      .order('ranking_key', { ascending: true })
      .range(offset, offset + pageSize - 1)
      .returns<CommunityLikeSnapshotRow[]>();
    if (error) throw new Error(`Failed to load Overall likes: ${error.message}`);
    // Supabase's RPC type can include an unexpected object variant.
    // Verify that a table-returning function actually returns an array.
    if (data != null && !Array.isArray(data)) {
      throw new Error('Failed to load Overall likes: unexpected response format');
    }
    const page: CommunityLikeSnapshotRow[] = data ?? [];
    for (const row of page) {
      likeCounts[row.ranking_key] = row.like_count;
      if (row.liked_by_me) likedCollectionIds.push(row.ranking_key);
    }
    if (page.length < pageSize) break;
    offset += page.length;
  }
  return { likedCollectionIds, likeCounts };
}

export async function createCommunityLike(userId: string, rankingKey: string) {
  const { error } = await supabase.from('community_ranking_likes').upsert(
    { user_id: userId, ranking_key: rankingKey },
    { onConflict: 'user_id,ranking_key', ignoreDuplicates: true }
  );
  if (error) throw new Error(`Failed to like Overall: ${error.message}`);
}
export async function deleteCommunityLike(userId: string, rankingKey: string) {
  const { error } = await supabase.from('community_ranking_likes')
    .delete().eq('user_id', userId).eq('ranking_key', rankingKey);
  if (error) throw new Error(`Failed to unlike Overall: ${error.message}`);
}

export async function getCommunityComments(rankingKey: string): Promise<CommentRecord[]> {
  const { data, error } = await supabase.from('community_ranking_comments')
    .select(COMMUNITY_COMMENT_SELECT).eq('ranking_key', rankingKey)
    .is('removed_at', null).order('created_at', { ascending: true })
    .returns<CommunityCommentRow[]>();
  if (error) throw new Error(`Failed to load Overall comments: ${error.message}`);
  return (data ?? []).map(mapComment);
}

export async function getCommunityCommentCounts(keys: string[]): Promise<Record<string, number>> {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  if (!uniqueKeys.length) return {};
  const counts: Record<string, number> = {};
  // Server-side exact counts avoid truncated row results. Limit concurrency
  // so screens with many Overall rankings don't flood the database.
  const batchSize = 6;
  for (let i = 0; i < uniqueKeys.length; i += batchSize) {
    const batch = uniqueKeys.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (rankingKey) => {
      const { count, error } = await supabase.from('community_ranking_comments')
        .select('id', { count: 'exact', head: true })
        .eq('ranking_key', rankingKey)
        .is('removed_at', null);
      if (error) throw new Error(`Failed to load Overall comment counts: ${error.message}`);
      if (count === null) throw new Error('Failed to load Overall comment counts: count unavailable');
      return { rankingKey, count };
    }));
    for (const { rankingKey, count } of results) counts[rankingKey] = count;
  }
  return counts;
}

export async function createCommunityComment(
  userId: string, rankingKey: string, content: string, replyToCommentId?: string
): Promise<CommentRecord> {
  const { data, error } = await supabase.from('community_ranking_comments').insert({
    user_id: userId, ranking_key: rankingKey, content: content.trim(),
    reply_to_comment_id: replyToCommentId || null,
  }).select(COMMUNITY_COMMENT_SELECT).single<CommunityCommentRow>();
  if (error) throw new Error(`Failed to create Overall comment: ${error.message}`);
  return mapComment(data);
}
export async function updateCommunityComment(id: string, content: string): Promise<CommentRecord> {
  const { data, error } = await supabase.from('community_ranking_comments')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', id).is('removed_at', null)
    .select(COMMUNITY_COMMENT_SELECT).single<CommunityCommentRow>();
  if (error) throw new Error(`Failed to edit Overall comment: ${error.message}`);
  return mapComment(data);
}
export async function deleteCommunityComment(id: string): Promise<void> {
  const { error } = await supabase.from('community_ranking_comments').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete Overall comment: ${error.message}`);
}
export async function getLikedCommunityCommentIds(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('community_ranking_comment_likes')
    .select('comment_id').eq('user_id', userId).in('comment_id', ids)
    .returns<CommunityCommentLikeRow[]>();
  if (error) throw new Error(`Failed to load Overall comment likes: ${error.message}`);
  return (data ?? []).map(row => row.comment_id);
}
export async function createCommunityCommentLike(userId: string, commentId: string) {
  const { error } = await supabase.from('community_ranking_comment_likes').upsert(
    { user_id: userId, comment_id: commentId },
    { onConflict: 'user_id,comment_id', ignoreDuplicates: true }
  );
  if (error) throw new Error(`Failed to like Overall comment: ${error.message}`);
}
export async function deleteCommunityCommentLike(userId: string, commentId: string) {
  const { error } = await supabase.from('community_ranking_comment_likes')
    .delete().eq('user_id', userId).eq('comment_id', commentId);
  if (error) throw new Error(`Failed to unlike Overall comment: ${error.message}`);
}
export class CommunityCommentAlreadyReportedError extends Error {
  constructor() {
    super("You've already reported this comment.");
    this.name = 'CommunityCommentAlreadyReportedError';
  }
}

export async function reportCommunityComment(input: {
  reporterId: string;
  reportedUserId: string;
  commentId: string;
  reason: string;
}) {
  const { error } = await supabase.from('community_ranking_comment_reports').insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    reported_comment_id: input.commentId,
    reason: input.reason,
  });
  if (error) {
    if (
      error.code === '23505' &&
      error.message.includes('reporter_id_reported_comment')
    ) {
      throw new CommunityCommentAlreadyReportedError();
    }
    throw new Error(`Failed to report Overall comment: ${error.message}`);
  }
}
