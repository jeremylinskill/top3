import { supabase } from '@/lib/supabase';
import { File } from 'expo-file-system';

const AVATAR_BUCKET = 'avatars';

export type UploadAvatarParams = {
  userId: string;
  localUri: string;
  mimeType?: string | null;
};

export type UploadedAvatar = {
  path: string;
  publicUrl: string;
};

function getAvatarPath(userId: string) {
  return `${userId}/avatar`;
}

function getContentType(
  file: File,
  suppliedMimeType?: string | null
) {
  if (suppliedMimeType) {
    return suppliedMimeType;
  }

  if (file.type) {
    return file.type;
  }

  return 'image/jpeg';
}

export async function uploadAvatar({
  userId,
  localUri,
  mimeType,
}: UploadAvatarParams): Promise<UploadedAvatar> {
  if (!userId) {
    throw new Error(
      'A user ID is required to upload an avatar.'
    );
  }

  if (!localUri) {
    throw new Error(
      'An image URI is required to upload an avatar.'
    );
  }

  const file = new File(localUri);

  if (!file.exists) {
    throw new Error(
      'The selected avatar image could not be found.'
    );
  }

  const fileData = await file.arrayBuffer();
  const path = getAvatarPath(userId);

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, fileData, {
      contentType: getContentType(
        file,
        mimeType
      ),
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return {
    path,
    publicUrl: getAvatarPublicUrl(path),
  };
}

export function getAvatarPublicUrl(
  path: string
): string {
  if (!path) {
    throw new Error(
      'An avatar storage path is required.'
    );
  }

  const { data } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteAvatar(
  userId: string
): Promise<void> {
  if (!userId) {
    throw new Error(
      'A user ID is required to delete an avatar.'
    );
  }

  const path = getAvatarPath(userId);

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([path]);

  if (error) {
    throw error;
  }
}