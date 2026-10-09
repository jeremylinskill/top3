import { supabase } from '@/lib/supabase';

export type MusicianRole =
  | 'vocalist'
  | 'guitarist'
  | 'drummer'
  | 'bassist'
  | 'mc'
  | 'dj';

export type MusicianSearchResult = {
  id: string;
  name: string;
  sortName: string;
  appleMusicArtistId?: string;
  imageUrlOverride?: string;
  previewArtistIdOverride?: string;
  bylineOverride?: string;
  role: MusicianRole;
  roleRank: number;
  matchedAlias?: string;
};

type MusicianSearchRow = {
  id: string;
  name: string;
  sort_name: string;
  apple_music_artist_id: string | null;
  image_url_override: string | null;
  preview_artist_id_override: string | null;
  byline_override: string | null;
  role: MusicianRole;
  role_rank: number;
  matched_alias: string | null;
};

function normalizeMusicianSearchQuery(
  value: string
): string {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .replace(/\./g, '')
    .replace(
      /[^a-z0-9]+/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function mapMusicianSearchRow(
  row: MusicianSearchRow
): MusicianSearchResult {
  return {
    id: row.id,
    name: row.name,
    sortName: row.sort_name,
    appleMusicArtistId:
      row.apple_music_artist_id ??
      undefined,
    imageUrlOverride:
      row.image_url_override ??
      undefined,
    previewArtistIdOverride:
      row.preview_artist_id_override ??
      undefined,
    bylineOverride:
      row.byline_override ??
      undefined,
    role: row.role,
    roleRank: row.role_rank,
    matchedAlias:
      row.matched_alias ??
      undefined,
  };
}

export async function searchMusiciansByRole(
  role: MusicianRole,
  query: string,
  limit = 20
): Promise<MusicianSearchResult[]> {
  const normalizedQuery =
    normalizeMusicianSearchQuery(
      query
    );

  const normalizedLimit =
    Math.min(
      Math.max(
        Math.floor(limit),
        1
      ),
      50
    );

  const { data, error } =
    await supabase.rpc(
      'search_musicians_by_role_with_overrides',
      {
        p_role: role,
        p_query: normalizedQuery,
        p_limit: normalizedLimit,
      }
    );

  if (error) {
    if (__DEV__) {
      console.log(
        'Musician catalogue search failed:',
        error
      );
    }

    throw new Error(
      'Musician search is temporarily unavailable.'
    );
  }

  if (!Array.isArray(data)) {
    if (__DEV__) {
      console.log(
        'Musician catalogue returned an invalid response:',
        data
      );
    }

    throw new Error(
      'Musician search returned an invalid response.'
    );
  }

  return (
    data as MusicianSearchRow[]
  ).map(
    mapMusicianSearchRow
  );
}

export async function getPopularMusiciansByRole(
  role: MusicianRole,
  limit = 20
): Promise<MusicianSearchResult[]> {
  return searchMusiciansByRole(
    role,
    '',
    limit
  );
}
