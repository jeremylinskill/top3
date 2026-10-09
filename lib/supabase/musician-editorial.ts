import { supabase } from '@/lib/supabase';

export type MusicianEditorial = {
  imageUrlOverride?: string;
  bylineOverride?: string;
};

type MusicianEditorialRow = {
  id: string;
  image_url_override: string | null;
  byline_override: string | null;
};

const CACHE_DURATION_MS = 5 * 60 * 1000;
const BATCH_SIZE = 100;

const editorialCache = new Map<
  string,
  {
    value: MusicianEditorial | null;
    expiresAt: number;
  }
>();

export async function getMusicianEditorialByIds(
  musicianIds: string[]
): Promise<Map<string, MusicianEditorial>> {
  const uniqueIds = Array.from(
    new Set(
      musicianIds
        .map((id) => id.trim())
        .filter((id) => id.startsWith('musician-'))
    )
  );

  const result = new Map<string, MusicianEditorial>();
  const now = Date.now();

  const uncachedIds = uniqueIds.filter((id) => {
    const cached = editorialCache.get(id);

    if (!cached || cached.expiresAt <= now) {
      return true;
    }

    if (cached.value) {
      result.set(id, cached.value);
    }

    return false;
  });

  for (let index = 0; index < uncachedIds.length; index += BATCH_SIZE) {
    const batch = uncachedIds.slice(index, index + BATCH_SIZE);

    const { data, error } = await supabase
      .from('musicians')
      .select('id,image_url_override,byline_override')
      .in('id', batch);

    if (error) {
      throw new Error(
        `Failed to load musician editorial data: ${error.message}`
      );
    }

    const rows = (data ?? []) as MusicianEditorialRow[];
    const rowsById = new Map(rows.map((row) => [row.id, row]));

    for (const id of batch) {
      const row = rowsById.get(id);

      const value: MusicianEditorial | null = row
        ? {
            imageUrlOverride:
              row.image_url_override?.trim() || undefined,
            bylineOverride:
              row.byline_override?.trim() || undefined,
          }
        : null;

      editorialCache.set(id, {
        value,
        expiresAt: Date.now() + CACHE_DURATION_MS,
      });

      if (value) {
        result.set(id, value);
      }
    }
  }

  return result;
}
