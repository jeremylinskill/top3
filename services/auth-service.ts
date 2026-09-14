import { supabase } from '@/lib/supabase';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import {
  Session,
  User,
} from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';

export interface SignUpWithEmailParams {
  email: string;
  password: string;
}

export interface SignInWithEmailParams {
  email: string;
  password: string;
}

type AppleAuthTokenResponse = {
  success?: boolean;
  error?: string;
};

const googleIosClientId =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (googleIosClientId && googleWebClientId) {
  GoogleSignin.configure({
    iosClientId: googleIosClientId,
    webClientId: googleWebClientId,
  });
}

async function clearGoogleSignInState() {
  if (!GoogleSignin.hasPreviousSignIn()) {
    return;
  }

  try {
    await GoogleSignin.signOut();
  } catch (error) {
    if (__DEV__) {
      console.log(
        'Failed to clear previous Google sign-in state:',
        error
      );
    }
  }
}

function isInvalidRefreshTokenError(
  error: unknown
): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const authError = error as {
    code?: unknown;
    message?: unknown;
  };

  const code =
    typeof authError.code === 'string'
      ? authError.code.toLowerCase()
      : '';

  const message =
    typeof authError.message === 'string'
      ? authError.message.toLowerCase()
      : '';

  return (
    code === 'refresh_token_not_found' ||
    message.includes(
      'invalid refresh token'
    ) ||
    message.includes(
      'refresh token not found'
    )
  );
}

async function clearLocalAuthSession() {
  const { error } =
    await supabase.auth.signOut({
      scope: 'local',
    });

  if (error) {
    throw error;
  }
}

export async function signUpWithEmail({
  email,
  password,
}: SignUpWithEmailParams) {
  const emailRedirectTo =
    Linking.createURL('/auth-callback');

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function resendConfirmationEmail(
  email: string
) {
  const emailRedirectTo =
    Linking.createURL('/auth-callback');

  const { data, error } =
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo,
      },
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function setSessionFromUrl(
  url: string
): Promise<Session | null> {
  const {
    params,
    errorCode,
  } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const accessToken =
    params.access_token;

  const refreshToken =
    params.refresh_token;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { data, error } =
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signInWithEmail({
  email,
  password,
}: SignInWithEmailParams) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function requestPasswordReset(
  email: string
) {
  const redirectTo =
    Linking.createURL('/reset-password');

  const { data, error } =
    await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo,
      }
    );

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePassword(
  password: string
) {
  const { data, error } =
    await supabase.auth.updateUser({
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function isAppleSignInAvailable() {
  return AppleAuthentication.isAvailableAsync();
}

async function storeAppleRefreshToken(
  authorizationCode: string
) {
  const { data, error } =
    await supabase.functions.invoke(
      'apple-auth-token',
      {
        method: 'POST',
        body: {
          authorizationCode,
        },
      }
    );

  if (error) {
    if (__DEV__) {
      console.log(
        'Apple auth token Edge Function invocation failed:',
        error
      );
    }

    return;
  }

  const response =
    data as AppleAuthTokenResponse | null;

  if (
    response?.error ||
    !response?.success
  ) {
    if (__DEV__) {
      console.log(
        'Apple auth token Edge Function returned an error:',
        response?.error ??
          'Invalid response.'
      );
    }
  }
}

export async function signInWithApple() {
  const isAvailable =
    await AppleAuthentication.isAvailableAsync();

  if (!isAvailable) {
    throw new Error(
      'Sign in with Apple is not available on this device.'
    );
  }

  const credential =
    await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication
          .AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication
          .AppleAuthenticationScope.EMAIL,
      ],
    });

  if (!credential.identityToken) {
    throw new Error(
      'Apple did not return an identity token.'
    );
  }

  const { data, error } =
    await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

  if (error) {
    throw error;
  }

  if (credential.authorizationCode) {
    void storeAppleRefreshToken(
      credential.authorizationCode
    );
  }

  /*
   * Apple only provides the user's name during
   * the first authorization. Preserve it in the
   * Supabase user metadata while it is available.
   */
  if (credential.fullName) {
    const fullName =
      AppleAuthentication.formatFullName(
        credential.fullName
      ).trim();

    const givenName =
      credential.fullName.givenName?.trim() ??
      null;

    const familyName =
      credential.fullName.familyName?.trim() ??
      null;

    if (
      fullName ||
      givenName ||
      familyName
    ) {
      const { error: updateError } =
        await supabase.auth.updateUser({
          data: {
            full_name: fullName || null,
            given_name: givenName,
            family_name: familyName,
          },
        });

      if (updateError) {
        throw updateError;
      }
    }
  }

  return {
    ...data,
    appleCredential: credential,
  };
}

export async function signInWithGoogle() {
  if (!googleIosClientId) {
    throw new Error(
      'The Google iOS client ID is not configured.'
    );
  }

  if (!googleWebClientId) {
    throw new Error(
      'The Google Web client ID is not configured.'
    );
  }

  /*
   * Clear any Google user state left from an earlier
   * native sign-in before starting a new interactive
   * sign-in. This avoids reusing stale iOS credentials.
   */
  await clearGoogleSignInState();

  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    return null;
  }

  const { idToken } = response.data;

  if (!idToken) {
    throw new Error(
      'Google did not return an identity token.'
    );
  }

  const { data, error } =
    await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

  if (error) {
    throw error;
  }

  return {
    ...data,
    googleUser: response.data.user,
  };
}

export async function getSession(): Promise<
  Session | null
> {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    if (
      isInvalidRefreshTokenError(
        sessionError
      )
    ) {
      await clearLocalAuthSession();
      return null;
    }

    throw sessionError;
  }

  const currentSession =
    sessionData.session;

  if (!currentSession) {
    return null;
  }

  const {
    data: refreshedData,
    error: refreshError,
  } = await supabase.auth.refreshSession(
    currentSession
  );

  if (refreshError) {
    if (
      isInvalidRefreshTokenError(
        refreshError
      )
    ) {
      await clearLocalAuthSession();
      return null;
    }

    throw refreshError;
  }

  return refreshedData.session;
}

export async function signOut() {
  /*
   * Clear the native Google sign-in state as well as
   * the Supabase session. Google cleanup is best-effort
   * so it cannot prevent the user from signing out of
   * Top 3.
   */
  await clearGoogleSignInState();

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function onAuthStateChange(
  callback: (
    event: string,
    session: Session | null
  ) => void
) {
  return supabase.auth.onAuthStateChange(
    callback
  );
}

export function getCurrentUser(
  session: Session | null
): User | null {
  return session?.user ?? null;
}
