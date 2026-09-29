import { Top3Item } from '@/types/top3-item';

const GENRE_METADATA_CATEGORIES =
  new Set([
    'movies',
    'tv',
    'games',
  ]);

const MUSIC_METADATA_CATEGORIES =
  new Set([
    'songs',
    'albums',
  ]);

export function usesGenreMetadataPresentation(
  category: string
): boolean {
  return GENRE_METADATA_CATEGORIES.has(
    category
  );
}

function getDisplayGenreName(
  genre: string
): string {
  if (genre === 'Science Fiction') {
    return 'Sci-Fi';
  }

  if (genre === 'Role-playing (RPG)') {
    return 'RPG';
  }

  return genre;
}

function getDisplayGenres(
  item: Top3Item
): string[] {
  return (
    item.genres
      ?.map((genre) => genre.trim())
      .filter(
        (genre): genre is string =>
          genre.length > 0
      )
      .map(getDisplayGenreName)
      .slice(0, 3) ?? []
  );
}

function getPrimaryMusicGenre(
  item: Top3Item
): string {
  return (
    item.genres
      ?.map((genre) => genre.trim())
      .filter(
        (genre): genre is string =>
          genre.length > 0
      )
      .map(getDisplayGenreName)
      .find(
        (genre) =>
          genre.toLowerCase() !== 'music'
      ) ?? ''
  );
}

function getMusicMetadata(
  item: Top3Item
): string {
  const parts = [
    item.subtitle?.trim(),
    getPrimaryMusicGenre(item),
  ].filter(
    (part): part is string =>
      typeof part === 'string' &&
      part.length > 0
  );

  return parts.join(' · ');
}

export function getTop3ItemMetadata(
  item: Top3Item,
  category: string
): string {
  if (
    MUSIC_METADATA_CATEGORIES.has(
      category
    )
  ) {
    return getMusicMetadata(item);
  }

  if (
    !usesGenreMetadataPresentation(
      category
    )
  ) {
    return item.subtitle ?? '';
  }

  return getDisplayGenres(item).join(' · ');
}

export function getTop3ItemPreviewMetadata(
  item: Top3Item,
  category: string
): string {
  if (
    !usesGenreMetadataPresentation(
      category
    )
  ) {
    return item.subtitle ?? '';
  }

  const parts = [
    ...getDisplayGenres(item),
    item.releaseYear ?? item.subtitle,
  ].filter(
    (part): part is string =>
      typeof part === 'string' &&
      part.trim().length > 0
  );

  return parts.join(' · ');
}
