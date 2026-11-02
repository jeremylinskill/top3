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
  AppState,
  Platform,
} from 'react-native';

const MINIMUM_LOADING_DURATION_MS = 1100;
const PUSH_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

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

  // Repair missing push registrations when an opted-in user signs in or
  // returns to Top 3. Never request notification permission automatically.
  useEffect(() => {
    const userId = user?.id;

    if (
      isLoading ||
      !userId ||
      (
        Platform.OS !== 'ios' &&
        Platform.OS !== 'android'
      )
    ) {
      return;
    }

    let isCancelled = false;
    let isSyncing = false;
    let lastAttemptAt = 0;

    async function syncPushToken(
      authenticatedUserId: string
    ) {
      if (
        isCancelled ||
        isSyncing ||
        AppState.currentState !== 'active' ||
        Date.now() - lastAttemptAt < PUSH_SYNC_COOLDOWN_MS
      ) {
        return;
      }

      lastAttemptAt = Date.now();
      isSyncing = true;

      try {
        const isEnabled =
          await getPushNotificationsEnabled(
            authenticatedUserId
          );

        if (isCancelled || !isEnabled) {
          return;
        }

        // This only reads the OS permission; it never shows a prompt.
        const expoPushToken =
          await getExistingPushToken();

        if (isCancelled || !expoPushToken) {
          return;
        }

        // A user may have turned notifications off while we were awaiting
        // the token, so recheck their opt-in before writing to Supabase.
        if (
          !(await getPushNotificationsEnabled(
            authenticatedUserId
          )) ||
          isCancelled
        ) {
          return;
        }

        const platform = Platform.OS;
        if (platform !== 'ios' && platform !== 'android') {
          return;
        }

        await upsertPushToken({
          userId: authenticatedUserId,
          expoPushToken,
          platform,
        });

        // If Settings disabled notifications during the database request,
        // don't leave behind a newly registered device.
        if (
          !isCancelled &&
          !(await getPushNotificationsEnabled(
            authenticatedUserId
          ))
        ) {
          await deletePushToken(expoPushToken);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to sync push token with authenticated user:',
            error
          );
        }
      } finally {
        isSyncing = false;
      }
    }

    void syncPushToken(userId);

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        if (nextAppState === 'active') {
          void syncPushToken(userId);
        }
      }
    );

    return () => {
      isCancelled = true;
      subscription.remove();
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
