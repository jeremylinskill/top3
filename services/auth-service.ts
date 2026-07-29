import { supabase } from '@/lib/supabase';

export interface SignUpWithEmailParams {
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