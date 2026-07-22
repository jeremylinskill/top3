import { Top3Item } from '@/types/top3-item';

type MusicBrainzArtistCredit = {
  name?: string;
};

type MusicBrainzReleaseGroup = {
  id: string;
  title?: string;
  'first-release-date'?: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'artist-credit'?: MusicBrainzArtistCredit[];
};

type MusicBrainzSearchResponse = {
  'release-groups'?: MusicBrainzReleaseGroup[];
};

const API_BASE_URL =
  'https://musicbrainz.org/ws/2/release-group/';

const USER_AGENT =
  'Top3/0.5 (https://github.com/jeremylinskill/top3)';

function escapeLuceneQuery(value: string) {
  return value.replace(
    /([+\-!(){}\[\]^"~*?:\\/]|&&|\|\|)/g,
    '\\$1'
  );
}

function buildCoverUrl(releaseGroupId: string) {
  return `https://coverartarchive.org/release-group/${releaseGroupId}/front-500`;
}

export async function searchAlbums(
  query: string
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const escapedQuery = escapeLuceneQuery(trimmedQuery);

  const musicBrainzQuery =
    `releasegroup:"${escapedQuery}" AND ` +
    `primarytype:album NOT secondarytype:compilation`;

  const requestUrl =
    `${API_BASE_URL}?query=${encodeURIComponent(musicBrainzQuery)}` +
    `&fmt=json&limit=10`;

  const response = await fetch(requestUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `MusicBrainz request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as MusicBrainzSearchResponse;

  return (data['release-groups'] ?? []).map((releaseGroup) => {
    const artists =
      releaseGroup['artist-credit']
        ?.map((credit) => credit.name)
        .filter(Boolean)
        .join(', ') || 'Artist unknown';

    const releaseYear =
      releaseGroup['first-release-date']?.slice(0, 4);

    return {
      id: `album-${releaseGroup.id}`,
      title: releaseGroup.title ?? 'Untitled album',
      subtitle: releaseYear
        ? `${artists} · ${releaseYear}`
        : artists,
      imageUrl: buildCoverUrl(releaseGroup.id),
    };
  });
}