import { supabase } from '@/lib/supabase';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_or_abuse'
  | 'inappropriate_content'
  | 'impersonation'
  | 'other';

export type CreateUserReportInput = {
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string | null;
};

export type CreatePostReportInput = {
  reporterId: string;
  reportedUserId: string;
  reportedPostId: string;
  reason: ReportReason;
  details?: string | null;
};

export type CreateCommentReportInput = {
  reporterId: string;
  reportedUserId: string;
  reportedCommentId: string;
  reason: ReportReason;
  details?: string | null;
};

export async function createUserReport({
  reporterId,
  reportedUserId,
  reason,
  details,
}: CreateUserReportInput): Promise<void> {
  const normalizedReporterId =
    reporterId.trim();

  const normalizedReportedUserId =
    reportedUserId.trim();

  const normalizedDetails =
    details?.trim() || null;

  if (
    !normalizedReporterId ||
    !normalizedReportedUserId
  ) {
    throw new Error(
      'Both user IDs are required to create a report.'
    );
  }

  if (
    normalizedReporterId ===
    normalizedReportedUserId
  ) {
    throw new Error(
      'A user cannot report themselves.'
    );
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: normalizedReporterId,
      reported_user_id:
        normalizedReportedUserId,
      target_type: 'user',
      reported_post_id: null,
      reported_comment_id: null,
      reason,
      details: normalizedDetails,
    });

  if (error) {
    throw new Error(
      `Failed to report user: ${error.message}`
    );
  }
}

export async function createPostReport({
  reporterId,
  reportedUserId,
  reportedPostId,
  reason,
  details,
}: CreatePostReportInput): Promise<void> {
  const normalizedReporterId =
    reporterId.trim();

  const normalizedReportedUserId =
    reportedUserId.trim();

  const normalizedReportedPostId =
    reportedPostId.trim();

  const normalizedDetails =
    details?.trim() || null;

  if (
    !normalizedReporterId ||
    !normalizedReportedUserId ||
    !normalizedReportedPostId
  ) {
    throw new Error(
      'Reporter, reported user, and post IDs are required to create a post report.'
    );
  }

  if (
    normalizedReporterId ===
    normalizedReportedUserId
  ) {
    throw new Error(
      'A user cannot report their own post.'
    );
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: normalizedReporterId,
      reported_user_id:
        normalizedReportedUserId,
      target_type: 'post',
      reported_post_id:
        normalizedReportedPostId,
      reported_comment_id: null,
      reason,
      details: normalizedDetails,
    });

  if (error) {
    throw new Error(
      `Failed to report post: ${error.message}`
    );
  }
}

export async function createCommentReport({
  reporterId,
  reportedUserId,
  reportedCommentId,
  reason,
  details,
}: CreateCommentReportInput): Promise<void> {
  const normalizedReporterId =
    reporterId.trim();

  const normalizedReportedUserId =
    reportedUserId.trim();

  const normalizedReportedCommentId =
    reportedCommentId.trim();

  const normalizedDetails =
    details?.trim() || null;

  if (
    !normalizedReporterId ||
    !normalizedReportedUserId ||
    !normalizedReportedCommentId
  ) {
    throw new Error(
      'Reporter, reported user, and comment IDs are required to create a comment report.'
    );
  }

  if (
    normalizedReporterId ===
    normalizedReportedUserId
  ) {
    throw new Error(
      'A user cannot report their own comment.'
    );
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: normalizedReporterId,
      reported_user_id:
        normalizedReportedUserId,
      target_type: 'comment',
      reported_post_id: null,
      reported_comment_id:
        normalizedReportedCommentId,
      reason,
      details: normalizedDetails,
    });

  if (error) {
    throw new Error(
      `Failed to report comment: ${error.message}`
    );
  }
}