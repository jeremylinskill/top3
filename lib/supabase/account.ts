import { supabase } from '@/lib/supabase';

type DeleteAccountResponse = {
  success?: boolean;
  error?: string;
};

export async function deleteAccount(): Promise<void> {
  const { data, error } =
    await supabase.functions.invoke(
      'delete-account',
      {
        method: 'POST',
      }
    );

  if (error) {
    console.error(
      'Delete Account Edge Function invocation failed:',
      error
    );

    throw new Error(
      'Unable to delete your account right now.'
    );
  }

  const response =
    data as DeleteAccountResponse | null;

  if (response?.error) {
    console.error(
      'Delete Account Edge Function returned an error:',
      response.error
    );

    throw new Error(response.error);
  }

  if (!response?.success) {
    console.error(
      'Delete Account Edge Function returned an invalid response:',
      data
    );

    throw new Error(
      'Delete account returned an invalid response.'
    );
  }
}
