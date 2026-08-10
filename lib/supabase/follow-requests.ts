import { supabase } from '@/lib/supabase';

export type FollowRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined';

export type FollowRequest = {
  id: string;
  requesterUserId: string;
  recipientUserId: string;
  status: FollowRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type FollowRequestSnapshot = {
  sentRequests: FollowRequest[];
  receivedRequests: FollowRequest[];
};

type FollowRequestRow = {
  id: string;
  requester_user_id: string;
  recipient_user_id: string;
  status: FollowRequestStatus;
  created_at: string;
  updated_at: string;
};

function mapFollowRequestRow(
  row: FollowRequestRow
): FollowRequest {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id,
    recipientUserId: row.recipient_user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeUserId(userId: string) {
  return userId.trim();
}

export async function getFollowRequestSnapshot(
  userId: string
): Promise<FollowRequestSnapshot> {
  const normalizedUserId =
    normalizeUserId(userId);

  if (!normalizedUserId) {
    return {
      sentRequests: [],
      receivedRequests: [],
    };
  }

  const { data, error } = await supabase
    .from('follow_requests')
    .select(
      `
        id,
        requester_user_id,
        recipient_user_id,
        status,
        created_at,
        updated_at
      `
    )
    .or(
      `requester_user_id.eq.${normalizedUserId},recipient_user_id.eq.${normalizedUserId}`
    )
    .eq('status', 'pending')
    .order('created_at', {
      ascending: false,
    })
    .returns<FollowRequestRow[]>();

  if (error) {
    throw new Error(
      `Failed to load follow requests: ${error.message}`
    );
  }

  const requests = (data ?? []).map(
    mapFollowRequestRow
  );

  return {
    sentRequests: requests.filter(
      (request) =>
        request.requesterUserId ===
        normalizedUserId
    ),
    receivedRequests: requests.filter(
      (request) =>
        request.recipientUserId ===
        normalizedUserId
    ),
  };
}

export async function createFollowRequest(
  requesterUserId: string,
  recipientUserId: string
): Promise<FollowRequest> {
  const normalizedRequesterUserId =
    normalizeUserId(requesterUserId);

  const normalizedRecipientUserId =
    normalizeUserId(recipientUserId);

  if (
    !normalizedRequesterUserId ||
    !normalizedRecipientUserId
  ) {
    throw new Error(
      'Both users are required to create a follow request.'
    );
  }

  if (
    normalizedRequesterUserId ===
    normalizedRecipientUserId
  ) {
    throw new Error(
      'A user cannot request to follow themselves.'
    );
  }

  const { data, error } = await supabase
    .from('follow_requests')
    .upsert(
      {
        requester_user_id:
          normalizedRequesterUserId,
        recipient_user_id:
          normalizedRecipientUserId,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          'requester_user_id,recipient_user_id',
      }
    )
    .select(
      `
        id,
        requester_user_id,
        recipient_user_id,
        status,
        created_at,
        updated_at
      `
    )
    .single<FollowRequestRow>();

  if (error) {
    throw new Error(
      `Failed to create follow request: ${error.message}`
    );
  }

  return mapFollowRequestRow(data);
}

export async function cancelFollowRequest(
  requestId: string
): Promise<void> {
  const normalizedRequestId =
    requestId.trim();

  if (!normalizedRequestId) {
    return;
  }

  const { error } = await supabase
    .from('follow_requests')
    .delete()
    .eq('id', normalizedRequestId);

  if (error) {
    throw new Error(
      `Failed to cancel follow request: ${error.message}`
    );
  }
}

export async function declineFollowRequest(
  requestId: string
): Promise<void> {
  const normalizedRequestId =
    requestId.trim();

  if (!normalizedRequestId) {
    return;
  }

  const { error } = await supabase
    .from('follow_requests')
    .update({
      status: 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('id', normalizedRequestId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(
      `Failed to decline follow request: ${error.message}`
    );
  }
}

export async function acceptFollowRequest(
  requestId: string
): Promise<void> {
  const normalizedRequestId =
    requestId.trim();

  if (!normalizedRequestId) {
    return;
  }

  const { error } = await supabase.rpc(
    'accept_follow_request',
    {
      request_id: normalizedRequestId,
    }
  );

  if (error) {
    throw new Error(
      `Failed to accept follow request: ${error.message}`
    );
  }
}