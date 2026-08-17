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
      reason,
      details: normalizedDetails,
    });

  if (error) {
    throw new Error(
      `Failed to report user: ${error.message}`
    );
  }
}