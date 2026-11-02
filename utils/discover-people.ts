import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';

export type DiscoverPerson = {
  user: UserProfile;
  detail: string;
};

type DiscoverPeopleOptions = {
  posts: Post[];
  profilesByUserId: Record<string, UserProfile>;
  newestProfiles: UserProfile[];
  currentUserId: string;
  followedUserIds: string[];
  blockedUserIds: string[];
  excludedUserIds: string[];
};

// Preserve Discover's existing order: active Top 3 creators first,
// followed by recently joined public members. No duplicates.
export function buildDiscoverPeople({
  posts,
  profilesByUserId,
  newestProfiles,
  currentUserId,
  followedUserIds,
  blockedUserIds,
  excludedUserIds,
}: DiscoverPeopleOptions): DiscoverPerson[] {
  const excluded = new Set([
    currentUserId,
    ...followedUserIds,
    ...blockedUserIds,
    ...excludedUserIds,
  ]);

  const collectionCounts = new Map<string, number>();
  for (const post of posts) {
    if (blockedUserIds.includes(post.authorId)) continue;
    collectionCounts.set(
      post.authorId,
      (collectionCounts.get(post.authorId) ?? 0) + 1
    );
  }

  const activeCreators = [...collectionCounts.entries()]
    .map(([id, count]) => ({
      user: profilesByUserId[id],
      count,
    }))
    .filter((entry): entry is { user: UserProfile; count: number } =>
      entry.user !== undefined &&
      entry.user.visibility === 'public' &&
      !excluded.has(entry.user.id)
    )
    .sort((a, b) =>
      b.count - a.count ||
      a.user.displayName.localeCompare(b.user.displayName)
    );

  const people: DiscoverPerson[] = [];
  for (const { user, count } of activeCreators) {
    excluded.add(user.id);
    people.push({
      user,
      detail: count === 1
        ? '1 published Top 3'
        : `${count} published Top 3s`,
    });
  }

  for (const user of newestProfiles) {
    if (excluded.has(user.id) || user.visibility !== 'public') continue;
    excluded.add(user.id);
    people.push({ user, detail: 'New to Top 3' });
  }

  return people;
}
