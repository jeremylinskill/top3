import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/lib/supabase/storage';
import { UserProfile } from '@/types/user-profile';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type ProfileContextValue = {
  profile: UserProfile;
  updateProfile: (
    updates: Partial<UserProfile>
  ) => Promise<void>;
};

type ProfileProviderProps = {
  children: ReactNode;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  is_public: boolean;
};

const EMPTY_PROFILE: UserProfile = {
  id: '',
  displayName: '',
  username: '',
  bio: '',
  avatarUrl: undefined,
  visibility: 'public',
};

const ProfileContext =
  createContext<
    ProfileContextValue | undefined
  >(undefined);

function formatDisplayName(
  emailUsername: string
) {
  const withoutTrailingNumbers =
    emailUsername.replace(/\d+$/g, '');

  const words = withoutTrailingNumbers
    .split(/[._-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return 'Top3 User';
  }

  return words
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(' ');
}

function formatUsername(
  emailUsername: string
) {
  const formattedUsername = emailUsername
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^[._]+|[._]+$/g, '');

  return formattedUsername || 'top3user';
}

function createDefaultProfile(
  userId: string,
  email?: string
): UserProfile {
  const emailUsername =
    email?.split('@')[0]?.trim() ||
    'top3user';

  return {
    id: userId,
    displayName:
      formatDisplayName(emailUsername),
    username: formatUsername(emailUsername),
    bio: '',
    avatarUrl: undefined,
    visibility: 'public',
  };
}

function mapRowToProfile(
  row: ProfileRow
): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    bio: row.bio,
    avatarUrl: row.avatar_url ?? undefined,
    visibility: row.is_public
      ? 'public'
      : 'private',
  };
}

function createProfileInsert(
  profile: UserProfile
) {
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.displayName,
    bio: profile.bio,
    avatar_url: profile.avatarUrl ?? null,
    is_public:
      profile.visibility === 'public',
  };
}

function isLocalAvatarUri(
  avatarUrl?: string
) {
  if (!avatarUrl) {
    return false;
  }

  return (
    avatarUrl.startsWith('file://') ||
    avatarUrl.startsWith('content://') ||
    avatarUrl.startsWith('ph://') ||
    avatarUrl.startsWith('asset-library://')
  );
}

function addCacheVersion(
  publicUrl: string
) {
  const separator = publicUrl.includes('?')
    ? '&'
    : '?';

  return `${publicUrl}${separator}v=${Date.now()}`;
}

export function ProfileProvider({
  children,
}: ProfileProviderProps) {
  const { user } = useAuth();

  const [profile, setProfile] =
    useState<UserProfile>(EMPTY_PROFILE);

  const [loadedUserId, setLoadedUserId] =
    useState<string | null>(null);

  const userId = user?.id;
  const userEmail = user?.email;

  useEffect(() => {
    let isCancelled = false;

    async function loadProfile() {
      setProfile(EMPTY_PROFILE);
      setLoadedUserId(null);

      if (!userId) {
        return;
      }

      const defaultProfile =
        createDefaultProfile(
          userId,
          userEmail
        );

      try {
        const {
          data: existingProfile,
          error: loadError,
        } = await supabase
          .from('profiles')
          .select(
            `
              id,
              username,
              display_name,
              bio,
              avatar_url,
              is_public
            `
          )
          .eq('id', userId)
          .maybeSingle<ProfileRow>();

        if (loadError) {
          throw loadError;
        }

        if (isCancelled) {
          return;
        }

        if (existingProfile) {
          setProfile(
            mapRowToProfile(existingProfile)
          );

          setLoadedUserId(userId);
          return;
        }

        const {
          data: createdProfile,
          error: createError,
        } = await supabase
          .from('profiles')
          .insert(
            createProfileInsert(
              defaultProfile
            )
          )
          .select(
            `
              id,
              username,
              display_name,
              bio,
              avatar_url,
              is_public
            `
          )
          .single<ProfileRow>();

        if (
          createError?.code === '23505'
        ) {
          const uniqueProfile: UserProfile = {
            ...defaultProfile,
            username:
              `${defaultProfile.username}-` +
              userId.slice(0, 6),
          };

          const {
            data: fallbackProfile,
            error: fallbackError,
          } = await supabase
            .from('profiles')
            .insert(
              createProfileInsert(
                uniqueProfile
              )
            )
            .select(
              `
                id,
                username,
                display_name,
                bio,
                avatar_url,
                is_public
              `
            )
            .single<ProfileRow>();

          if (fallbackError) {
            throw fallbackError;
          }

          if (isCancelled) {
            return;
          }

          setProfile(
            mapRowToProfile(
              fallbackProfile
            )
          );

          setLoadedUserId(userId);
          return;
        }

        if (createError) {
          throw createError;
        }

        if (isCancelled) {
          return;
        }

        setProfile(
          mapRowToProfile(createdProfile)
        );

        setLoadedUserId(userId);
      } catch (error) {
        console.error(
          'Failed to load or create profile:',
          error
        );

        if (isCancelled) {
          return;
        }

        setProfile(defaultProfile);
        setLoadedUserId(userId);
      }
    }

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [userId, userEmail]);

  async function updateProfile(
    updates: Partial<UserProfile>
  ): Promise<void> {
    if (
      !userId ||
      loadedUserId !== userId
    ) {
      return;
    }

    const previousProfile = profile;

    const optimisticProfile: UserProfile = {
      ...previousProfile,
      ...updates,
      id: userId,
    };

    setProfile(optimisticProfile);

    try {
      let persistedAvatarUrl =
        optimisticProfile.avatarUrl;

      if (
        updates.avatarUrl &&
        isLocalAvatarUri(updates.avatarUrl)
      ) {
        const uploadedAvatar =
          await uploadAvatar({
            userId,
            localUri: updates.avatarUrl,
          });

        persistedAvatarUrl = addCacheVersion(
          uploadedAvatar.publicUrl
        );
      }

      const savedProfile: UserProfile = {
        ...optimisticProfile,
        avatarUrl:
          persistedAvatarUrl || undefined,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          username: savedProfile.username,
          display_name:
            savedProfile.displayName,
          bio: savedProfile.bio,
          avatar_url:
            savedProfile.avatarUrl ?? null,
          is_public:
            savedProfile.visibility ===
            'public',
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setProfile(savedProfile);
    } catch (error) {
      console.error(
        'Failed to update profile:',
        error
      );

      setProfile(previousProfile);
      throw error;
    }
  }

  const contextValue =
    useMemo<ProfileContextValue>(
      () => ({
        profile,
        updateProfile,
      }),
      [profile]
    );

  return (
    <ProfileContext.Provider
      value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(
    ProfileContext
  );

  if (!context) {
    throw new Error(
      'useProfile must be used inside a ProfileProvider'
    );
  }

  return context;
}