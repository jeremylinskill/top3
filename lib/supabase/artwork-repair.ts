import { supabase } from '@/lib/supabase';

export type RepairCollectionArtworkResult = {
  success: boolean;
  repaired: boolean;
  imageUrl: string | null;
  reason?: string;
};

export type RepairCollectionArtworkOptions = {
  replaceExisting?: boolean;
};

type RepairCollectionArtworkResponse = {
  success?: boolean;
  repaired?: boolean;
  imageUrl?: string | null;
  reason?: string;
  error?: string;
};

export async function repairCollectionArtwork(
  collectionId: string,
  itemId: string,
  options?: RepairCollectionArtworkOptions
): Promise<RepairCollectionArtworkResult> {
  const trimmedCollectionId =
    collectionId.trim();

  const trimmedItemId =
    itemId.trim();

  if (!trimmedCollectionId || !trimmedItemId) {
    throw new Error(
      'Collection ID and item ID are required.'
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      'repair-collection-artwork',
      {
        method: 'POST',
        body: {
          collectionId:
            trimmedCollectionId,
          itemId:
            trimmedItemId,
          replaceExisting:
            options?.replaceExisting ===
            true,
        },
      }
    );

  if (error) {
    if (__DEV__) {
      console.log(
        'Artwork repair Edge Function invocation failed:',
        error
      );
    }

    throw new Error(
      'Unable to repair collection artwork right now.'
    );
  }

  const response =
    data as RepairCollectionArtworkResponse | null;

  if (response?.error) {
    if (__DEV__) {
      console.log(
        'Artwork repair Edge Function returned an error:',
        response.error
      );
    }

    throw new Error(
      response.error
    );
  }

  if (
    !response?.success ||
    typeof response.repaired !==
      'boolean'
  ) {
    if (__DEV__) {
      console.log(
        'Artwork repair Edge Function returned an invalid response:',
        data
      );
    }

    throw new Error(
      'Artwork repair returned an invalid response.'
    );
  }

  return {
    success: true,
    repaired:
      response.repaired,
    imageUrl:
      typeof response.imageUrl ===
        'string'
        ? response.imageUrl
        : null,
    reason:
      typeof response.reason ===
        'string'
        ? response.reason
        : undefined,
  };
}
