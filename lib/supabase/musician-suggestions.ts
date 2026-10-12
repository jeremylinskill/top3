import type { SuggestMusicianRole } from '@/components/suggest-musician-sheet';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

type SubmissionResponse = {
  success?: boolean;
  alreadySubmitted?: boolean;
  error?: string;
};

type SubmissionInput = {
  name: string;
  role: SuggestMusicianRole;
  knownFor: string;
};

export async function submitMusicianSuggestion({
  name,
  role,
  knownFor,
}: SubmissionInput): Promise<{
  alreadySubmitted: boolean;
}> {
  const { data, error } =
    await supabase.functions.invoke<SubmissionResponse>(
      'submit-musician-suggestion',
      {
        body: { name, role, knownFor },
      }
    );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const response = await error.context.clone().json();

        if (
          response &&
          typeof response.error === 'string'
        ) {
          throw new Error(response.error);
        }
      } catch (cause) {
        if (
          cause instanceof Error &&
          cause.message !== error.message
        ) {
          throw cause;
        }
      }
    }

    throw new Error(
      'Unable to send your suggestion. Please try again.'
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ??
        'Unable to save your suggestion.'
    );
  }

  return {
    alreadySubmitted: data.alreadySubmitted === true,
  };
}
