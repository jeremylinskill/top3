import { supabase } from '@/lib/supabase';
import {
    FunctionsHttpError,
} from '@supabase/supabase-js';

export type ModerationReportStatus =
  | 'pending'
  | 'reviewed'
  | 'resolved'
  | 'dismissed';

export type ModerationReportResolution =
  | 'no_action'
  | 'content_removed'
  | 'user_warned'
  | 'user_suspended'
  | 'user_banned';

export type ModerationReportTargetType =
  | 'user'
  | 'post'
  | 'comment';

export type ModerationReportProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type ModerationReportedComment = {
  type: 'comment';
  id: string;
  collectionId: string;
  userId: string;
  content: string;
  createdAt: string;
};

export type ModerationReportedPost = {
  type: 'post';
  id: string | null;
  collectionId: string;
  userId: string;
  category: string;
  topic: string | null;
  title: string;
  status: string;
  items: unknown;
  publishedAt: string | null;
  createdAt: string;
};

export type ModerationReportedContent =
  | ModerationReportedComment
  | ModerationReportedPost;

export type ModerationReport = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details: string | null;
  status: ModerationReportStatus;
  createdAt: string;
  targetType: ModerationReportTargetType;
  reportedPostId: string | null;
  reportedCommentId: string | null;
  reviewedAt: string | null;
  resolution: ModerationReportResolution | null;
  moderatorNotes: string | null;
  reporter: ModerationReportProfile | null;
  reportedUser: ModerationReportProfile | null;
  reportedContent: ModerationReportedContent | null;
};

type VerifyModerationAccessResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

type PendingReportProfileRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type PendingReportedCommentRow = {
  type: 'comment';
  id: string;
  collectionId: string;
  userId: string;
  content: string;
  createdAt: string;
};

type PendingReportedPostRow = {
  type: 'post';
  id: string | null;
  collectionId: string;
  userId: string;
  category: string;
  topic: string | null;
  title: string;
  status: string;
  items: unknown;
  publishedAt: string | null;
  createdAt: string;
};

type PendingReportedContentRow =
  | PendingReportedCommentRow
  | PendingReportedPostRow;

type PendingReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string | null;
  status: ModerationReportStatus;
  created_at: string;
  target_type: ModerationReportTargetType;
  reported_post_id: string | null;
  reported_comment_id: string | null;
  reviewed_at: string | null;
  resolution: ModerationReportResolution | null;
  moderator_notes: string | null;
  reporter: PendingReportProfileRow | null;
  reportedUser: PendingReportProfileRow | null;
  reportedContent:
    | PendingReportedContentRow
    | null;
};

type GetPendingReportsResponse = {
  success?: boolean;
  reports?: PendingReportRow[];
  error?: string;
};

type ModerationDecisionResponse = {
  success?: boolean;
  report?: {
    id?: string;
    status?: ModerationReportStatus;
    reviewed_at?: string | null;
    resolution?: ModerationReportResolution | null;
  };
  error?: string;
};

async function readFunctionError(
  error: FunctionsHttpError
): Promise<unknown> {
  try {
    return await error.context.json();
  } catch {
    return await error.context.text();
  }
}

function mapPendingReportRow(
  row: PendingReportRow
): ModerationReport {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportedUserId: row.reported_user_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    targetType: row.target_type,
    reportedPostId: row.reported_post_id,
    reportedCommentId:
      row.reported_comment_id,
    reviewedAt: row.reviewed_at,
    resolution: row.resolution,
    moderatorNotes: row.moderator_notes,
    reporter: row.reporter,
    reportedUser: row.reportedUser,
    reportedContent:
      row.reportedContent,
  };
}

export async function verifyModerationAccess(): Promise<void> {
  const { data, error } =
    await supabase.functions.invoke(
      'moderation',
      {
        method: 'POST',
      }
    );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const errorBody =
        await readFunctionError(error);

      console.error(
        'Moderation Edge Function returned an HTTP error:',
        errorBody
      );
    } else {
      console.error(
        'Moderation Edge Function invocation failed:',
        error
      );
    }

    throw new Error(
      'Unable to verify moderation access.'
    );
  }

  const response =
    data as VerifyModerationAccessResponse | null;

  if (response?.error) {
    console.error(
      'Moderation Edge Function returned an error:',
      response.error
    );

    throw new Error(response.error);
  }

  if (!response?.success) {
    console.error(
      'Moderation Edge Function returned an invalid response:',
      data
    );

    throw new Error(
      'Moderation access verification returned an invalid response.'
    );
  }
}

export async function getPendingReports(): Promise<
  ModerationReport[]
> {
  const { data, error } =
    await supabase.functions.invoke(
      'moderation',
      {
        method: 'POST',
        body: {
          action: 'list-pending',
        },
      }
    );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const errorBody =
        await readFunctionError(error);

      console.error(
        'Moderation Edge Function returned an HTTP error while loading reports:',
        errorBody
      );
    } else {
      console.error(
        'Moderation Edge Function invocation failed while loading reports:',
        error
      );
    }

    throw new Error(
      'Unable to load pending reports.'
    );
  }

  const response =
    data as GetPendingReportsResponse | null;

  if (response?.error) {
    console.error(
      'Moderation Edge Function returned an error while loading reports:',
      response.error
    );

    throw new Error(response.error);
  }

  if (
    !response?.success ||
    !Array.isArray(response.reports)
  ) {
    console.error(
      'Moderation Edge Function returned an invalid pending-reports response:',
      data
    );

    throw new Error(
      'Pending reports returned an invalid response.'
    );
  }

  return response.reports.map(
    mapPendingReportRow
  );
}

export async function dismissReport(
  reportId: string
): Promise<void> {
  const normalizedReportId =
    reportId.trim();

  if (!normalizedReportId) {
    throw new Error(
      'Report ID is required.'
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      'moderation',
      {
        method: 'POST',
        body: {
          action: 'dismiss-report',
          reportId: normalizedReportId,
        },
      }
    );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const errorBody =
        await readFunctionError(error);

      console.error(
        'Moderation Edge Function returned an HTTP error while dismissing report:',
        errorBody
      );
    } else {
      console.error(
        'Moderation Edge Function invocation failed while dismissing report:',
        error
      );
    }

    throw new Error(
      'Unable to dismiss report.'
    );
  }

  const response =
    data as ModerationDecisionResponse | null;

  if (response?.error) {
    console.error(
      'Moderation Edge Function returned an error while dismissing report:',
      response.error
    );

    throw new Error(response.error);
  }

  if (
    !response?.success ||
    response.report?.id !==
      normalizedReportId ||
    response.report.status !==
      'dismissed'
  ) {
    console.error(
      'Moderation Edge Function returned an invalid dismiss-report response:',
      data
    );

    throw new Error(
      'Dismiss report returned an invalid response.'
    );
  }
}

export async function removeReportedContent(
  reportId: string
): Promise<void> {
  const normalizedReportId =
    reportId.trim();

  if (!normalizedReportId) {
    throw new Error(
      'Report ID is required.'
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      'moderation',
      {
        method: 'POST',
        body: {
          action: 'remove-content',
          reportId: normalizedReportId,
        },
      }
    );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const errorBody =
        await readFunctionError(error);

      console.error(
        'Moderation Edge Function returned an HTTP error while removing reported content:',
        errorBody
      );
    } else {
      console.error(
        'Moderation Edge Function invocation failed while removing reported content:',
        error
      );
    }

    throw new Error(
      'Unable to remove reported content.'
    );
  }

  const response =
    data as ModerationDecisionResponse | null;

  if (response?.error) {
    console.error(
      'Moderation Edge Function returned an error while removing reported content:',
      response.error
    );

    throw new Error(response.error);
  }

  if (
    !response?.success ||
    response.report?.id !==
      normalizedReportId ||
    response.report.status !==
      'resolved' ||
    response.report.resolution !==
      'content_removed'
  ) {
    console.error(
      'Moderation Edge Function returned an invalid remove-content response:',
      data
    );

    throw new Error(
      'Remove content returned an invalid response.'
    );
  }
}