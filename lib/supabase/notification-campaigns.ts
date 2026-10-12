import { supabase } from '@/lib/supabase';
import type { NotificationDestination } from '@/types/notification-destination';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type NotificationCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export type NotificationCampaign = {
  id: string;
  title: string | null;
  message: string | null;
  categoryId: string | null;
  destinationKind: 'overall' | 'type' | 'theme' | null;
  optionId: string | null;
  audience: 'test' | 'all';
  status: NotificationCampaignStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  sentAt: string | null;
  targetCount: number;
  acceptedCount: number;
  failedCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type NotificationCampaignRow = {
  id: string;
  title: string | null;
  message: string | null;
  category_id: string | null;
  destination_kind: NotificationCampaign['destinationKind'];
  option_id: string | null;
  audience: NotificationCampaign['audience'];
  status: NotificationCampaignStatus;
  scheduled_at: string | null;
  started_at: string | null;
  sent_at: string | null;
  target_count: number;
  accepted_count: number;
  failed_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type CampaignListResponse = {
  success?: boolean;
  campaigns?: NotificationCampaignRow[];
  error?: string;
};

function mapCampaign(
  row: NotificationCampaignRow
): NotificationCampaign {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    categoryId: row.category_id,
    destinationKind: row.destination_kind,
    optionId: row.option_id,
    audience: row.audience,
    status: row.status,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    sentAt: row.sent_at,
    targetCount: row.target_count,
    acceptedCount: row.accepted_count,
    failedCount: row.failed_count,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getNotificationCampaignHistory():
  Promise<NotificationCampaign[]> {
  const { data, error } =
    await supabase.functions.invoke<CampaignListResponse>(
      'manage-notification-campaigns',
      {
        body: { action: 'list' },
      }
    );

  if (error) {
    let reason: string | null = null;

    if (error instanceof FunctionsHttpError) {
      try {
        const response: unknown =
          await error.context.clone().json();

        if (
          response !== null &&
          typeof response === 'object' &&
          'error' in response &&
          typeof response.error === 'string'
        ) {
          reason = response.error;
        }
      } catch {
        // Fall back to a general error message.
      }
    }

    throw new Error(
      reason ?? 'Unable to load notification history.'
    );
  }

  if (
    data?.success !== true ||
    !Array.isArray(data.campaigns)
  ) {
    throw new Error(
      data?.error ??
        'Unable to load notification history.'
    );
  }

  return data.campaigns.map(mapCampaign);
}


export type SaveNotificationDraftInput = {
  id?: string | null;
  title: string;
  message: string;
  destination: NotificationDestination | null;
};

type SaveNotificationDraftResponse = {
  success?: boolean;
  campaignId?: string;
  error?: string;
};

export async function saveNotificationCampaignDraft(
  input: SaveNotificationDraftInput
): Promise<string> {
  const { data, error } =
    await supabase.functions.invoke<SaveNotificationDraftResponse>(
      'manage-notification-campaigns',
      {
        body: {
          action: 'save-draft',
          id: input.id ?? null,
          title: input.title,
          message: input.message,
          destination: input.destination,
        },
      }
    );

  if (error) {
    let reason: string | null = null;

    if (error instanceof FunctionsHttpError) {
      try {
        const response: unknown =
          await error.context.clone().json();

        if (
          response !== null &&
          typeof response === 'object' &&
          'error' in response &&
          typeof response.error === 'string'
        ) {
          reason = response.error;
        }
      } catch {
        // Fall back to a general error message.
      }
    }

    throw new Error(
      reason ?? 'Unable to save notification draft.'
    );
  }

  if (
    data?.success !== true ||
    typeof data.campaignId !== 'string'
  ) {
    throw new Error(
      data?.error ?? 'Unable to save notification draft.'
    );
  }

  return data.campaignId;
}
