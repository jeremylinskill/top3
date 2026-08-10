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

export interface SignUpWithEmailParams {
  email: string;
  password: string;
}

export interface SignInWithEmailParams {
  email: string;
  password: string;
}

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

export async function signUpWithEmail({
  email,
  password,
}: SignUpWithEmailParams) {
  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
    });

  if (error) {
    throw error;
  }

  return data;
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

export async function isAppleSignInAvailable() {
  return AppleAuthentication.isAvailableAsync();
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
    throw refreshError;
  }

  return refreshedData.session;
}

export async function signOut() {
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