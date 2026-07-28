export type ProfileVisibility =
  | 'public'
  | 'private';

export type UserProfile = {
  id: string;
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;

  /**
   * Controls whether this profile can be
   * recommended and discovered by other users.
   */
  visibility: ProfileVisibility;
};