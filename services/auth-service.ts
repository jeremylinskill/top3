import { supabase } from '@/lib/supabase';
import {
    Session,
    User,
} from '@supabase/supabase-js';

export interface SignUpWithEmailParams {
  email: string;
  password: string;
}

export interface SignInWithEmailParams {
  email: string;
  password: string;
}

export async function signUpWithEmail({
  email,
  password,
}: SignUpWithEmailParams) {
  const { data, error } = await supabase.auth.signUp({
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

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

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
  return supabase.auth.onAuthStateChange(callback);
}

export function getCurrentUser(
  session: Session | null
): User | null {
  return session?.user ?? null;
}