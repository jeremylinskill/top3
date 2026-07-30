import { supabase } from '@/lib/supabase';

export type FollowSnapshot = {
  followedUserIds: string[];
  followerUserIds: string[];
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