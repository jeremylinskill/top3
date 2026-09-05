import {
  identifyAnalyticsUser,
  resetAnalyticsUser,
} from '@/lib/analytics';
import {
  getExistingPushToken,
} from '@/lib/notifications';
import {
  deletePushToken,
  upsertPushToken,
} from '@/lib/supabase/push-tokens';
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  signOut as signOutFromService,
} from '@/services/auth-service';
import {
  getPushNotificationsEnabled,
  markWelcomeAsSeen,
} from '@/services/onboarding-service';
import {
  Session,
  User,
} from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Platform,
} from 'react-native';

const MINIMUM_LOADING_DURATION_MS = 1100;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  hasAuthLoadError: boolean;
  retryAuthLoad: () => void;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined
  );

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    hasAuthLoadError,
    setHasAuthLoadError,
  ] = useState(false);

  const [
    authLoadAttempt,
    setAuthLoadAttempt,
  ] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const minimumLoadingDuration =
        new Promise<void>((resolve) => {
          setTimeout(
            resolve,
            MINIMUM_LOADING_DURATION_MS
          );
        });

      try {
        setHasAuthLoadError(false);

        const [
          currentSession,
        ] = await Promise.all([
          getSession(),
          minimumLoadingDuration,
        ]);

        if (isMounted) {
          setSession(currentSession);
          setHasAuthLoadError(false);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to initialize authentication:',
            error
          );
        }

        await minimumLoadingDuration;

        if (isMounted) {
          setHasAuthLoadError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeAuth();

    const {
      data: { subscription },
    } = onAuthStateChange(
      (_event, nextSession) => {
        if (isMounted) {
          setSession(nextSession);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [authLoadAttempt]);

  const retryAuthLoad = useCallback(() => {
    setIsLoading(true);
    setHasAuthLoadError(false);
    setAuthLoadAttempt(
      (currentAttempt) =>
        currentAttempt + 1
    );
  }, []);

  const sessionUser =
    getCurrentUser(session);

  const user =
    sessionUser &&
    (
      sessionUser.app_metadata.provider !==
        'email' ||
      Boolean(
        sessionUser.email_confirmed_at
      )
    )
      ? sessionUser
      : null;

  useEffect(() => {
    if (user?.id) {
      identifyAnalyticsUser(user.id);
      void markWelcomeAsSeen();
    } else {
      resetAnalyticsUser();
    }
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;

    if (
      isLoading ||
      !userId
    ) {
      return;
    }

    let isCancelled = false;

    async function syncPushToken(
      authenticatedUserId: string
    ) {
      try {
        const pushNotificationsEnabled =
          await getPushNotificationsEnabled(
            authenticatedUserId
          );

        if (
          isCancelled ||
          !pushNotificationsEnabled
        ) {
          return;
        }

        const expoPushToken =
          await getExistingPushToken();

        if (
          isCancelled ||
          !expoPushToken
        ) {
          return;
        }

        if (
          Platform.OS !== 'ios' &&
          Platform.OS !== 'android'
        ) {
          return;
        }

        await upsertPushToken({
          userId:
            authenticatedUserId,
          expoPushToken,
          platform: Platform.OS,
        });
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to sync push token with authenticated user:',
            error
          );
        }
      }
    }

    void syncPushToken(userId);

    return () => {
      isCancelled = true;
    };
  }, [
    isLoading,
    user?.id,
  ]);

  const signOut = useCallback(async () => {
    try {
      const expoPushToken =
        await getExistingPushToken();

      if (expoPushToken) {
        await deletePushToken(
          expoPushToken
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.log(
          'Failed to remove push token during sign out:',
          error
        );
      }
    }

    await signOutFromService();
  }, []);

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,
        session,
        isLoading,
        hasAuthLoadError,
        retryAuthLoad,
        isAuthenticated:
          Boolean(user),
        signOut,
      }),
      [
        user,
        session,
        isLoading,
        hasAuthLoadError,
        retryAuthLoad,
        signOut,
      ]
    );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
