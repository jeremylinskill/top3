import { supabase } from '@/lib/supabase';
import {
    ProfileVisibility,
    UserProfile,
} from '@/types/user-profile';

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  is_public: boolean;
};

function mapProfileRow(
  row: ProfileRow
): UserProfile {
  const visibility: ProfileVisibility =
    row.is_public ? 'public' : 'private';

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? undefined,
    visibility,
  };
}

export async function searchPublicProfiles(
  query: string,
  currentUserId: string
): Promise<UserProfile[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
        id,
        username,
        display_name,
        bio,
        is_public
      `
    )
    .eq('is_public', true)
    .neq('id', currentUserId)
    .or(
      `username.ilike.%${normalizedQuery}%,display_name.ilike.%${normalizedQuery}%`
    )
    .order('display_name', {
      ascending: true,
    })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    mapProfileRow(row as ProfileRow)
  );
}

export async function getPublicProfileById(
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
        id,
        username,
        display_name,
        bio,
        is_public
      `
    )
    .eq('id', userId)
    .eq('is_public', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapProfileRow(data as ProfileRow);
}