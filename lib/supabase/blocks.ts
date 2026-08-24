import { supabase } from '@/lib/supabase';

type BlockRow = {
  blocked_user_id: string;
};

export async function getBlockedUserIds(
  userId: string
): Promise<string[]> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_user_id')
    .eq('blocker_id', normalizedUserId)
    .returns<BlockRow[]>();

  if (error) {
    throw new Error(
      `Failed to load blocked users: ${error.message}`
    );
  }

  return (data ?? []).map(
    (block) => block.blocked_user_id
  );
}

export async function isUserBlocked(
  blockerId: string,
  blockedUserId: string
): Promise<boolean> {
  const normalizedBlockerId =
    blockerId.trim();

  const normalizedBlockedUserId =
    blockedUserId.trim();

  if (
    !normalizedBlockerId ||
    !normalizedBlockedUserId
  ) {
    return false;
  }

  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_user_id')
    .eq('blocker_id', normalizedBlockerId)
    .eq(
      'blocked_user_id',
      normalizedBlockedUserId
    )
    .maybeSingle<BlockRow>();

  if (error) {
    throw new Error(
      `Failed to check block status: ${error.message}`
    );
  }

  return Boolean(data);
}

export async function createBlock(
  blockerId: string,
  blockedUserId: string
): Promise<void> {
  const normalizedBlockerId =
    blockerId.trim();

  const normalizedBlockedUserId =
    blockedUserId.trim();

  if (
    !normalizedBlockerId ||
    !normalizedBlockedUserId
  ) {
    throw new Error(
      'Both user IDs are required to create a block.'
    );
  }

  if (
    normalizedBlockerId ===
    normalizedBlockedUserId
  ) {
    throw new Error(
      'A user cannot block themselves.'
    );
  }

  const { error } = await supabase.rpc(
    'block_user',
    {
      target_user_id:
        normalizedBlockedUserId,
    }
  );

  if (error) {
    throw new Error(
      `Failed to block user: ${error.message}`
    );
  }
}

export async function deleteBlock(
  blockerId: string,
  blockedUserId: string
): Promise<void> {
  const normalizedBlockerId =
    blockerId.trim();

  const normalizedBlockedUserId =
    blockedUserId.trim();

  if (
    !normalizedBlockerId ||
    !normalizedBlockedUserId
  ) {
    return;
  }

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', normalizedBlockerId)
    .eq(
      'blocked_user_id',
      normalizedBlockedUserId
    );

  if (error) {
    throw new Error(
      `Failed to unblock user: ${error.message}`
    );
  }
}