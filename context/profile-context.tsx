import { UserProfile } from '@/types/user-profile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

type ProfileContextValue = {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
};

type ProfileProviderProps = {
  children: ReactNode;
};

const STORAGE_KEY = 'top3-user-profile';

const DEFAULT_PROFILE: UserProfile = {
  id: 'local-user',
  displayName: 'Jeremy',
  username: 'jeremy',
  bio: '',
};

const ProfileContext =
  createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({
  children,
}: ProfileProviderProps) {
  const [profile, setProfile] =
    useState<UserProfile>(DEFAULT_PROFILE);

  const [hasLoadedStorage, setHasLoadedStorage] =
    useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const savedProfile =
          await AsyncStorage.getItem(STORAGE_KEY);

        if (savedProfile) {
          setProfile(
            JSON.parse(savedProfile) as UserProfile
          );
        }
      } catch (error) {
        console.error(
          'Failed to load profile:',
          error
        );
      } finally {
        setHasLoadedStorage(true);
      }
    }

    loadProfile();
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) {
      return;
    }

    async function saveProfile() {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(profile)
        );
      } catch (error) {
        console.error(
          'Failed to save profile:',
          error
        );
      }
    }

    saveProfile();
  }, [profile, hasLoadedStorage]);

  function updateProfile(
    updates: Partial<UserProfile>
  ) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      ...updates,
    }));
  }

  return (
    <ProfileContext.Provider
      value={{
        profile,
        updateProfile,
      }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error(
      'useProfile must be used inside a ProfileProvider'
    );
  }

  return context;
}