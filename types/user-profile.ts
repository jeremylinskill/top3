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

  /**
   * Tracks whether this authenticated user has
   * completed or skipped the first-time onboarding flow.
   */
  hasCompletedOnboarding: boolean;
};