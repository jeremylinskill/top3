import { supabase } from '@/lib/supabase';

// Direct messaging access is deliberately routed through the guarded RPCs.
// The database verifies auth.uid(), mutual follows, blocks and rate limits.
export type DmConversation = {
  id: string;
  user_low_id: string;
  user_high_id: string;
  created_at: string;
  last_message_at: string | null;
};

export type DmMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  shared_collection_id: string | null;
  created_at: string;
};

export type DmReadState = {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
};

export function getOtherDmParticipant(
  conversation: DmConversation,
  currentUserId: string
): string | null {
  if (conversation.user_low_id === currentUserId) {
    return conversation.user_high_id;
  }
  if (conversation.user_high_id === currentUserId) {
    return conversation.user_low_id;
  }
  return null;
}

export async function openDmConversation(otherUserId: string): Promise<string> {
  const recipient = otherUserId.trim();
  if (!recipient) throw new Error('Select a person to message.');

  const { data, error } = await supabase.rpc('dm_create_conversation', {
    p_other_user_id: recipient,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'string' || !data) {
    throw new Error('Unable to open the conversation.');
  }
  return data;
}

export async function listDmConversations(
  currentUserId: string,
  limit = 40
): Promise<DmConversation[]> {
  const userId = currentUserId.trim();
  if (!userId) return [];
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));

  const { data, error } = await supabase
    .from('dm_conversations')
    .select('id,user_low_id,user_high_id,created_at,last_message_at')
    .or(`user_low_id.eq.${userId},user_high_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`Unable to load conversations: ${error.message}`);
  return (data ?? []) as DmConversation[];
}

export async function getDmConversation(
  conversationId: string
): Promise<DmConversation | null> {
  if (!conversationId.trim()) return null;
  const { data, error } = await supabase
    .from('dm_conversations')
    .select('id,user_low_id,user_high_id,created_at,last_message_at')
    .eq('id', conversationId.trim())
    .maybeSingle<DmConversation>();

  if (error) throw new Error(`Unable to load conversation: ${error.message}`);
  return data ?? null;
}

// Most recent page, returned oldest-to-newest for rendering.
// Fetching older pages can be added once the first conversation UI is working.
export async function listDmMessages(
  conversationId: string,
  limit = 50
): Promise<DmMessage[]> {
  const id = conversationId.trim();
  if (!id) return [];
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));

  const { data, error } = await supabase
    .from('dm_messages')
    .select('id,conversation_id,sender_id,body,shared_collection_id,created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`Unable to load messages: ${error.message}`);
  return ((data ?? []) as DmMessage[]).reverse();
}

// Search only message text visible to the signed-in participant. dm_messages RLS
// excludes unrelated conversations and moderator-removed messages.
// A short, debounced query and small result limit keep this initial search
// predictable until a larger-scale indexed search endpoint is warranted.
export async function searchDmMessages(
  searchText: string,
  limit = 40
): Promise<DmMessage[]> {
  const term = searchText.trim().slice(0, 100);
  if (term.length < 2) return [];
  const escaped = term.replace(/[\\%_]/g, (char) => `\\${char}`);
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 50));
  const { data, error } = await supabase
    .from('dm_messages')
    .select('id,conversation_id,sender_id,body,shared_collection_id,created_at')
    .ilike('body', `%${escaped}%`)
    .order('created_at', { ascending: false })
    .limit(safeLimit);
  if (error) throw new Error(`Unable to search messages: ${error.message}`);
  return (data ?? []) as DmMessage[];
}

export async function getDmConversationsByIds(
  conversationIds: string[]
): Promise<DmConversation[]> {
  const ids = Array.from(new Set(conversationIds.filter(Boolean))).slice(0, 50);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('dm_conversations')
    .select('id,user_low_id,user_high_id,created_at,last_message_at')
    .in('id', ids);
  if (error) throw new Error(`Unable to load search conversations: ${error.message}`);
  return (data ?? []) as DmConversation[];
}

// When a search result is older than the conversation's latest 50 messages,
// open a window beginning at the matched message instead of losing the match.
export async function listDmMessagesFrom(
  conversationId: string,
  messageId: string,
  limit = 50
): Promise<DmMessage[]> {
  const id = conversationId.trim();
  const target = messageId.trim();
  if (!id || !target) return [];
  const { data: match, error: matchError } = await supabase
    .from('dm_messages')
    .select('id,conversation_id,sender_id,body,shared_collection_id,created_at')
    .eq('id', target)
    .eq('conversation_id', id)
    .maybeSingle<DmMessage>();
  if (matchError) throw new Error(`Unable to load matched message: ${matchError.message}`);
  if (!match) return listDmMessages(id, limit);
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const { data: following, error } = await supabase
    .from('dm_messages')
    .select('id,conversation_id,sender_id,body,shared_collection_id,created_at')
    .eq('conversation_id', id)
    .gt('created_at', match.created_at)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(safeLimit - 1);
  if (error) throw new Error(`Unable to load matched conversation: ${error.message}`);
  return [match, ...((following ?? []) as DmMessage[])];
}

export async function sendDmMessage(
  conversationId: string,
  body: string
): Promise<string> {
  const id = conversationId.trim();
  const message = body.trim();
  if (!id) throw new Error('Conversation is required.');
  if (message.length < 1 || message.length > 2000) {
    throw new Error('Message must be between 1 and 2000 characters.');
  }

  // Never INSERT directly into dm_messages: the RPC enforces sender identity,
  // mutual follows, blocking, content rules, and a server-side rate limit.
  const { data, error } = await supabase.rpc('dm_send_message', {
    p_conversation_id: id,
    p_body: message,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'string' || !data) {
    throw new Error('Unable to send the message.');
  }
  return data;
}

export async function getMyDmReadStates(
  currentUserId: string,
  conversationIds: string[]
): Promise<DmReadState[]> {
  const userId = currentUserId.trim();
  const ids = Array.from(new Set(conversationIds.filter(Boolean)));
  if (!userId || ids.length === 0) return [];

  const { data, error } = await supabase
    .from('dm_read_states')
    .select('conversation_id,user_id,last_read_at')
    .eq('user_id', userId)
    .in('conversation_id', ids);

  if (error) throw new Error(`Unable to load read positions: ${error.message}`);
  return (data ?? []) as DmReadState[];
}

// Check whether any non-removed incoming message is later than the caller's
// read position. RLS limits the query to conversations the user participates in
// and hides moderator-removed messages. Fetch only an ID, never message bodies.
export async function hasUnreadDmMessages(
  conversationId: string,
  currentUserId: string,
  lastReadAt: string | null
): Promise<boolean> {
  const id = conversationId.trim();
  const userId = currentUserId.trim();
  if (!id || !userId) return false;

  let query = supabase
    .from('dm_messages')
    .select('id')
    .eq('conversation_id', id)
    .neq('sender_id', userId);
  if (lastReadAt) {
    query = query.gt('created_at', lastReadAt);
  }

  const { data, error } = await query.limit(1);
  if (error) throw new Error(`Unable to check unread messages: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export async function markDmRead(
  conversationId: string,
  lastDisplayedMessageId: string
): Promise<void> {
  if (!conversationId.trim() || !lastDisplayedMessageId.trim()) return;
  const { error } = await supabase.rpc('dm_mark_read', {
    p_conversation_id: conversationId.trim(),
    p_message_id: lastDisplayedMessageId.trim(),
  });
  if (error) throw new Error(error.message);
}

// Sharing uses a structured collection ID, not text URL parsing. Server-side
// functions enforce mutual follows, blocks, rate limits and list visibility.
export type DmSharedCollectionPreview = {
  id: string;
  title: string;
  category: string;
  user_id: string;
};

export async function getDmSharedCollectionPreviews(
  collectionIds: string[]
): Promise<Record<string, DmSharedCollectionPreview>> {
  const ids = Array.from(new Set(collectionIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('collections')
    .select('id,title,category,user_id')
    .in('id', ids)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .is('removed_at', null);
  if (error) throw new Error(`Unable to load shared Top 3: ${error.message}`);

  const previews: Record<string, DmSharedCollectionPreview> = {};
  for (const row of (data ?? []) as DmSharedCollectionPreview[]) {
    previews[row.id] = row;
  }
  return previews;
}

export async function listDmShareRecipientIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc('dm_list_share_recipients');
  if (error) throw new Error(`Unable to load recipients: ${error.message}`);
  return ((data ?? []) as { recipient_id: string }[])
    .map((row) => row.recipient_id).filter(Boolean);
}

export async function shareDmCollection(
  recipientId: string,
  collectionId: string
): Promise<string> {
  if (!recipientId.trim() || !collectionId.trim()) {
    throw new Error('Select a person and a published Top 3.');
  }
  const { data, error } = await supabase.rpc('dm_share_collection', {
    p_recipient_id: recipientId.trim(),
    p_collection_id: collectionId.trim(),
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'string' || !data) {
    throw new Error('Unable to share this Top 3.');
  }
  return data; // Conversation ID, for direct navigation to the new share.
}
