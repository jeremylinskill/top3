import { supabase } from '@/lib/supabase';
import type { NotificationDestination } from '@/types/notification-destination';
import { resolveDestinationGenre } from '@/types/notification-destination';

export type Top3Request = {
  id: string;
  requester_user_id: string;
  recipient_user_id: string;
  category_id: string;
  destination_kind: 'overall' | 'type' | 'theme' | 'genre';
  option_id: string | null;
  topic_label: string;
  status: 'pending' | 'fulfilled' | 'dismissed';
  fulfilled_collection_id: string | null;
  created_at: string;
};

export async function sendTop3Request(
  recipientUserId: string,
  destination: NotificationDestination
): Promise<void> {
  const label = destination.kind === 'genre'
    ? resolveDestinationGenre(destination)?.name
    : null;
  if (destination.kind === 'genre' && !label) {
    throw new Error('This topic is no longer available.');
  }
  const { error } = await supabase.rpc('send_top3_request', {
    p_recipient_user_id: recipientUserId,
    p_category_id: destination.categoryId,
    p_kind: destination.kind,
    p_option_id: destination.kind === 'overall' ? null : destination.optionId,
    p_topic_label: label,
  });
  if (error) throw new Error(error.message);
}

export async function getPendingTop3Requests(recipientUserId: string): Promise<Top3Request[]> {
  const { data, error } = await supabase.from('top3_requests')
    .select('id,requester_user_id,recipient_user_id,category_id,destination_kind,option_id,topic_label,status,fulfilled_collection_id,created_at')
    .eq('recipient_user_id', recipientUserId).eq('status', 'pending').order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as Top3Request[];
}

// Resolve one request by ID, not by how many requests are in the inbox.
export async function getPendingTop3Request(
  recipientUserId: string,
  requestId: string
): Promise<Top3Request | null> {
  const request = await getTop3RequestForRecipient(recipientUserId, requestId);
  return request?.status === 'pending' ? request : null;
}

// Keep historic request notifications useful after they are fulfilled:
// tapping an older request can open the exact published response instead of
// showing a misleading 'request unavailable' message.
export async function getTop3RequestForRecipient(
  recipientUserId: string,
  requestId: string
): Promise<Top3Request | null> {
  if (!recipientUserId || !requestId) return null;
  const { data, error } = await supabase.from('top3_requests')
    .select('id,requester_user_id,recipient_user_id,category_id,destination_kind,option_id,topic_label,status,fulfilled_collection_id,created_at')
    .eq('id', requestId).eq('recipient_user_id', recipientUserId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Top3Request | null;
}


// The publication trigger creates the requester's notification in the same
// database transaction as the list's first publication. Confirm that outcome
// before showing a success toast; never infer fulfillment from a button tap.
export async function getTop3RequestFulfillment(
  recipientUserId: string,
  requestId: string
): Promise<{ status: Top3Request['status']; fulfilled_collection_id: string | null } | null> {
  if (!recipientUserId || !requestId) return null;
  const { data, error } = await supabase.from('top3_requests')
    .select('status,fulfilled_collection_id')
    .eq('id', requestId).eq('recipient_user_id', recipientUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function dismissTop3Request(requestId: string): Promise<void> {
  const { data, error } = await supabase.rpc('dismiss_top3_request', { p_request_id: requestId });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error('This request is no longer pending.');
}

export async function completeTop3Request(requestId: string, collectionId: string): Promise<void> {
  const { data, error } = await supabase.rpc('complete_top3_request', {
    p_request_id: requestId, p_collection_id: collectionId,
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error('This request is no longer pending.');
}

export function requestDestination(request: Top3Request): NotificationDestination {
  const categoryId = request.category_id as NotificationDestination['categoryId'];
  return request.destination_kind === 'overall'
    ? { categoryId, kind: 'overall' }
    : { categoryId, kind: request.destination_kind, optionId: request.option_id ?? '' };
}
