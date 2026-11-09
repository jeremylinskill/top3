import { supabase } from '@/lib/supabase';

// Group messaging has separate tables and RPCs from existing one-to-one DMs.
// Supabase RLS and RPCs are authoritative for invitations, membership and blocks.
export type GroupConversation = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  last_message_at: string | null;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  status: 'invited' | 'accepted' | 'declined' | 'left';
  invited_by: string | null;
  joined_at: string | null;
};

export type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string;
  shared_collection_id: string | null;
  created_at: string;
};

export type GroupReadState = {
  group_id: string;
  user_id: string;
  last_read_at: string;
};

export async function createGroup(name: string, inviteeIds: string[]): Promise<string> {
  const title = name.trim();
  const ids = Array.from(new Set(inviteeIds.map((id) => id.trim()).filter(Boolean)));
  if (title.length < 1 || title.length > 80) {
    throw new Error('Group name must be between 1 and 80 characters.');
  }
  if (ids.length < 2 || ids.length > 9 || ids.length !== inviteeIds.length) {
    throw new Error('Choose 2–9 different people to invite.');
  }
  const { data, error } = await supabase.rpc('dm_group_create', {
    p_name: title,
    p_invitee_ids: ids,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'string' || !data) throw new Error('Unable to create the group.');
  return data;
}

export async function inviteToGroup(groupId: string, inviteeId: string): Promise<void> {
  if (!groupId.trim() || !inviteeId.trim()) throw new Error('Choose a group and person.');
  const { error } = await supabase.rpc('dm_group_invite', {
    p_group_id: groupId.trim(),
    p_invitee_id: inviteeId.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function respondToGroupInvitation(groupId: string, accept: boolean): Promise<void> {
  if (!groupId.trim()) throw new Error('Invitation unavailable.');
  const { error } = await supabase.rpc('dm_group_respond_invitation', {
    p_group_id: groupId.trim(),
    p_accept: accept,
  });
  if (error) throw new Error(error.message);
}

export async function leaveGroup(groupId: string): Promise<void> {
  if (!groupId.trim()) throw new Error('Group unavailable.');
  const { error } = await supabase.rpc('dm_group_leave', {
    p_group_id: groupId.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function listMyGroupMemberships(userId: string): Promise<GroupMember[]> {
  if (!userId.trim()) return [];
  const { data, error } = await supabase
    .from('dm_group_members')
    .select('group_id,user_id,status,invited_by,joined_at')
    .eq('user_id', userId.trim())
    .in('status', ['accepted', 'invited'])
    .limit(100);
  if (error) throw new Error(`Unable to load group membership: ${error.message}`);
  return (data ?? []) as GroupMember[];
}

export async function listGroupConversations(groupIds: string[]): Promise<GroupConversation[]> {
  const ids = Array.from(new Set(groupIds.filter(Boolean))).slice(0, 100);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('dm_group_conversations')
    .select('id,name,created_by,created_at,last_message_at')
    .in('id', ids);
  if (error) throw new Error(`Unable to load groups: ${error.message}`);
  return (data ?? []) as GroupConversation[];
}

export async function getGroupConversation(groupId: string): Promise<GroupConversation | null> {
  if (!groupId.trim()) return null;
  const { data, error } = await supabase
    .from('dm_group_conversations')
    .select('id,name,created_by,created_at,last_message_at')
    .eq('id', groupId.trim())
    .maybeSingle<GroupConversation>();
  if (error) throw new Error(`Unable to load group: ${error.message}`);
  return data ?? null;
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  if (!groupId.trim()) return [];
  const { data, error } = await supabase
    .from('dm_group_members')
    .select('group_id,user_id,status,invited_by,joined_at')
    .eq('group_id', groupId.trim())
    .in('status', ['accepted', 'invited']);
  if (error) throw new Error(`Unable to load members: ${error.message}`);
  return (data ?? []) as GroupMember[];
}

export async function listGroupMessages(groupId: string, limit = 50): Promise<GroupMessage[]> {
  if (!groupId.trim()) return [];
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const { data, error } = await supabase
    .from('dm_group_messages')
    .select('id,group_id,sender_id,body,shared_collection_id,created_at')
    .eq('group_id', groupId.trim())
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(safeLimit);
  if (error) throw new Error(`Unable to load group messages: ${error.message}`);
  return ((data ?? []) as GroupMessage[]).reverse();
}

export async function sendGroupMessage(groupId: string, body: string): Promise<string> {
  const message = body.trim();
  if (!groupId.trim()) throw new Error('Group unavailable.');
  if (!message.length || message.length > 2000) {
    throw new Error('Message must be between 1 and 2000 characters.');
  }
  const { data, error } = await supabase.rpc('dm_group_send_message', {
    p_group_id: groupId.trim(),
    p_body: message,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'string' || !data) throw new Error('Unable to send message.');
  return data;
}

export async function markGroupRead(groupId: string, messageId: string): Promise<void> {
  if (!groupId.trim() || !messageId.trim()) return;
  const { error } = await supabase.rpc('dm_group_mark_read', {
    p_group_id: groupId.trim(),
    p_message_id: messageId.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function getMyGroupReadStates(userId: string, groupIds: string[]): Promise<GroupReadState[]> {
  const ids = Array.from(new Set(groupIds.filter(Boolean))).slice(0, 100);
  if (!userId.trim() || !ids.length) return [];
  const { data, error } = await supabase
    .from('dm_group_read_states')
    .select('group_id,user_id,last_read_at')
    .eq('user_id', userId.trim())
    .in('group_id', ids);
  if (error) throw new Error(`Unable to load group read positions: ${error.message}`);
  return (data ?? []) as GroupReadState[];
}

export async function hasUnreadGroupMessages(
  groupId: string,
  userId: string,
  lastReadAt: string | null
): Promise<boolean> {
  if (!groupId.trim() || !userId.trim()) return false;
  let query = supabase
    .from('dm_group_messages')
    .select('id')
    .eq('group_id', groupId.trim())
    .neq('sender_id', userId.trim());
  if (lastReadAt) query = query.gt('created_at', lastReadAt);
  const { data, error } = await query.limit(1);
  if (error) throw new Error(`Unable to check group unread messages: ${error.message}`);
  return (data?.length ?? 0) > 0;
}
