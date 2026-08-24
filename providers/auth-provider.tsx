import {
  identifyAnalyticsUser,
} from '@/lib/analytics';
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  signOut as signOutFromService,
} from '@/services/auth-service';
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

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
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

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const currentSession =
          await getSession();

        if (isMounted) {
          setSession(currentSession);
        }
      } catch (error) {
        console.error(
          'Failed to initialize authentication:',
          error
        );
      } finally {
        if (isMounted) {
          // AuthGate should not render the rest of
          // the application until the initial
          // session restore has completed.
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = onAuthStateChange(
      (_event, nextSession) => {
        if (isMounted) {
          // Keep the current session in sync, but
          // do not finish initialization here.
          // During startup this callback can fire
          // before getSession() has restored the
          // persisted session.
          setSession(nextSession);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await signOutFromService();
  }, []);

  const user = getCurrentUser(session);

  useEffect(() => {
    identifyAnalyticsUser(user?.id);
  }, [user?.id]);

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,
        session,
        isLoading,
        isAuthenticated:
          Boolean(session),
        signOut,
      }),
      [
        user,
        session,
        isLoading,
        signOut,
      ]
    );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}