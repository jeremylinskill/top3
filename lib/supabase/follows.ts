import { supabase } from '@/lib/supabase';

export type FollowSnapshot = {
  followedUserIds: string[];
  followerUserIds: string[];
};

export type FollowCounts = {
  followingCount: number;
  followerCount: number;
};

type FollowRow = {
  follower_id: string;
  following_id: string;
};

export async function getFollowSnapshot(
  userId: string
): Promise<FollowSnapshot> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, following_id')
    .or(
      `follower_id.eq.${userId},following_id.eq.${userId}`
    )
    .returns<FollowRow[]>();

  if (error) {
    throw new Error(
      `Failed to load follows: ${error.message}`
    );
  }

  const followedUserIds: string[] = [];
  const followerUserIds: string[] = [];

  (data ?? []).forEach((follow) => {
    if (follow.follower_id === userId) {
      followedUserIds.push(
        follow.following_id
      );
    }

    if (follow.following_id === userId) {
      followerUserIds.push(
        follow.follower_id
      );
    }
  });

  return {
    followedUserIds,
    followerUserIds,
  };
}

export async function getFollowCounts(
  userId: string
): Promise<FollowCounts> {
  const [
    followingResult,
    followerResult,
  ] = await Promise.all([
    supabase
      .from('follows')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('follower_id', userId),

    supabase
      .from('follows')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('following_id', userId),
  ]);

  if (followingResult.error) {
    throw new Error(
      `Failed to load following count: ${followingResult.error.message}`
    );
  }

  if (followerResult.error) {
    throw new Error(
      `Failed to load follower count: ${followerResult.error.message}`
    );
  }

  return {
    followingCount:
      followingResult.count ?? 0,
    followerCount:
      followerResult.count ?? 0,
  };
}

export async function createFollow(
  followerId: string,
  followingId: string
): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: followerId,
      following_id: followingId,
    });

  if (error) {
    throw new Error(
      `Failed to create follow: ${error.message}`
    );
  }
}

export async function deleteFollow(
  followerId: string,
  followingId: string
): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    throw new Error(
      `Failed to delete follow: ${error.message}`
    );
  }
}

export async function removeFollower(
  followerId: string,
  currentUserId: string
): Promise<void> {
  const normalizedFollowerId =
    followerId.trim();

  const normalizedCurrentUserId =
    currentUserId.trim();

  if (
    !normalizedFollowerId ||
    !normalizedCurrentUserId
  ) {
    return;
  }

  if (
    normalizedFollowerId ===
    normalizedCurrentUserId
  ) {
    throw new Error(
      'A user cannot remove themselves as a follower.'
    );
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq(
      'follower_id',
      normalizedFollowerId
    )
    .eq(
      'following_id',
      normalizedCurrentUserId
    );

  if (error) {
    throw new Error(
      `Failed to remove follower: ${error.message}`
    );
  }
}