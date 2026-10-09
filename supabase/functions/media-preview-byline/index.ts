import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

type MediaPreviewEntityKind =
  | 'artist'
  | 'album'
  | 'song';

type MediaPreviewBylineKind =
  | 'item'
  | 'metadata'
  | 'artist_fallback';

type MediaPreviewBylineRequestBody = {
  entityKind?: unknown;
  appleMusicItemId?: unknown;
  title?: unknown;
  artistName?: unknown;
  appleMusicArtistId?: unknown;
  releaseYear?: unknown;
  albumName?: unknown;
};

type MediaPreviewBylineRow = {
  apple_music_item_id: string;
  entity_kind: MediaPreviewEntityKind;
  title: string;
  artist_name: string | null;
  album_name: string | null;
  byline: string;
  byline_kind: MediaPreviewBylineKind;
  source_provider: string;
  source_entity_id: string | null;
  generator_provider: string;
  generator_model: string;
  generator_version: string;
  manually_edited: boolean;
};

type WikidataSearchResult = {
  id?: string;
  label?: string;
  description?: string;
  match?: {
    text?: string;
  };
};

type WikidataSearchResponse = {
  search?: WikidataSearchResult[];
};

type WikidataSnak = {
  datavalue?: {
    value?: unknown;
  };
};

type WikidataClaim = {
  mainsnak?: WikidataSnak;
};

type WikidataEntity = {
  id?: string;
  labels?: Record<
    string,
    {
      value?: string;
    }
  >;
  descriptions?: Record<
    string,
    {
      value?: string;
    }
  >;
  claims?: Record<
    string,
    WikidataClaim[]
  >;
  sitelinks?: Record<
    string,
    {
      title?: string;
    }
  >;
};

type WikidataEntitiesResponse = {
  entities?: Record<
    string,
    WikidataEntity
  >;
};

type WikipediaExtractResponse = {
  query?: {
    pages?: Array<{
      title?: string;
      missing?: boolean;
      extract?: string;
    }>;
  };
};

const WIKIDATA_API_URL =
  'https://www.wikidata.org/w/api.php';

const WIKIPEDIA_API_URL =
  'https://en.wikipedia.org/w/api.php';

const WIKIMEDIA_USER_AGENT =
  'Top3/1.0 (media-preview-byline)';

const MAX_ARTIST_NAME_LENGTH = 200;
const MAX_MEDIA_TITLE_LENGTH = 300;
const MAX_ALBUM_NAME_LENGTH = 300;
const MAX_BYLINE_LENGTH = 120;
const GENERATOR_VERSION = '4';

const PERSON_ENTITY_ID = 'Q5';

function jsonResponse(
  body: unknown,
  status = 200
): Response {
  return Response.json(body, {
    status,
  });
}

function normalizeName(
  value: string
): string {
  return value
    .normalize('NFKD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(
      /[^a-z0-9]+/g,
      ' '
    )
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeWhitespace(
  value: string
): string {
  return value
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDescription(
  value: string | undefined
): string {
  if (!value) {
    return '';
  }

  return normalizeWhitespace(
    value
      .replace(
        /\s*\([^)]*\)\s*$/,
        ''
      )
      .replace(/\.$/, '')
  );
}

function capitalizeFirst(
  value: string
): string {
  if (!value) {
    return value;
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function stripTrailingPeriod(
  value: string
): string {
  return value
    .trim()
    .replace(/[.]+$/, '');
}

function joinNatural(
  values: string[]
): string {
  if (values.length === 0) {
    return '';
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values
    .slice(0, -1)
    .join(', ')} and ${values.at(-1)}`;
}

function quoteTitle(
  value: string
): string {
  return `“${value}”`;
}

function isValidAppleMusicId(
  value: string
): boolean {
  return (
    value.length > 0 &&
    /^[0-9]+$/.test(value)
  );
}

async function fetchJson<T>(
  url: URL
): Promise<T> {
  const response =
    await fetch(
      url.toString(),
      {
        headers: {
          Accept:
            'application/json',
          'User-Agent':
            WIKIMEDIA_USER_AGENT,
          'Api-User-Agent':
            WIKIMEDIA_USER_AGENT,
        },
      }
    );

  if (!response.ok) {
    const responseText =
      await response.text();

    throw new Error(
      `Wikimedia request failed (${response.status}): ${responseText}`
    );
  }

  return (await response.json()) as T;
}

function getSearchResultScore(
  result: WikidataSearchResult,
  artistName: string
): number {
  const requested =
    normalizeName(artistName);

  const label =
    normalizeName(
      result.label ?? ''
    );

  const matchedText =
    normalizeName(
      result.match?.text ?? ''
    );

  const description =
    (
      result.description ?? ''
    ).toLowerCase();

  let score = 0;

  if (label === requested) {
    score += 100;
  }

  if (
    matchedText === requested
  ) {
    score += 40;
  }

  if (
    /\b(singer|songwriter|musician|rapper|band|music group|musical group|dj|disc jockey|composer|record producer|artist)\b/i.test(
      description
    )
  ) {
    score += 30;
  }

  if (
    /\b(album|song|single|discography|film|episode|tour|concert|surname|family name)\b/i.test(
      description
    )
  ) {
    score -= 80;
  }

  return score;
}

async function findWikidataArtist(
  artistName: string
): Promise<WikidataSearchResult | null> {
  const url =
    new URL(
      WIKIDATA_API_URL
    );

  url.searchParams.set(
    'action',
    'wbsearchentities'
  );
  url.searchParams.set(
    'search',
    artistName
  );
  url.searchParams.set(
    'language',
    'en'
  );
  url.searchParams.set(
    'format',
    'json'
  );
  url.searchParams.set(
    'limit',
    '8'
  );

  const data =
    await fetchJson<WikidataSearchResponse>(
      url
    );

  const ranked =
    [...(data.search ?? [])]
      .map((result) => ({
        result,
        score:
          getSearchResultScore(
            result,
            artistName
          ),
      }))
      .sort(
        (
          first,
          second
        ) =>
          second.score -
          first.score
      );

  const best =
    ranked[0];

  if (
    !best ||
    !best.result.id ||
    best.score < 70
  ) {
    return null;
  }

  return best.result;
}

function getAlbumSearchResultScore(
  result: WikidataSearchResult,
  albumTitle: string,
  artistName: string
): number {
  const requestedTitle =
    normalizeName(albumTitle);

  const requestedArtist =
    normalizeName(artistName);

  const label =
    normalizeName(
      result.label ?? ''
    );

  const matchedText =
    normalizeName(
      result.match?.text ?? ''
    );

  const description =
    normalizeName(
      result.description ?? ''
    );

  let score = 0;

  if (label === requestedTitle) {
    score += 100;
  }

  if (
    matchedText ===
      requestedTitle
  ) {
    score += 40;
  }

  if (
    /\b(album|studio album|record|ep|extended play|mixtape)\b/i.test(
      result.description ?? ''
    )
  ) {
    score += 50;
  }

  if (
    requestedArtist &&
    description.includes(
      requestedArtist
    )
  ) {
    score += 60;
  }

  if (
    /\b(song|single|film|episode|tour|concert|book|video game)\b/i.test(
      result.description ?? ''
    )
  ) {
    score -= 100;
  }

  return score;
}

async function findWikidataAlbum(
  albumTitle: string,
  artistName: string
): Promise<WikidataSearchResult | null> {
  const url =
    new URL(
      WIKIDATA_API_URL
    );

  url.searchParams.set(
    'action',
    'wbsearchentities'
  );
  url.searchParams.set(
    'search',
    albumTitle
  );
  url.searchParams.set(
    'language',
    'en'
  );
  url.searchParams.set(
    'format',
    'json'
  );
  url.searchParams.set(
    'limit',
    '12'
  );

  const data =
    await fetchJson<WikidataSearchResponse>(
      url
    );

  const ranked =
    [...(data.search ?? [])]
      .map((result) => ({
        result,
        score:
          getAlbumSearchResultScore(
            result,
            albumTitle,
            artistName
          ),
      }))
      .sort(
        (
          first,
          second
        ) =>
          second.score -
          first.score
      );

  const best =
    ranked[0];

  if (
    !best ||
    !best.result.id ||
    best.score < 140
  ) {
    return null;
  }

  return best.result;
}

function getSongSearchResultScore(
  result: WikidataSearchResult,
  songTitle: string,
  artistName: string
): number {
  const requestedTitle =
    normalizeName(songTitle);

  const requestedArtist =
    normalizeName(artistName);

  const label =
    normalizeName(
      result.label ?? ''
    );

  const matchedText =
    normalizeName(
      result.match?.text ?? ''
    );

  const description =
    normalizeName(
      result.description ?? ''
    );

  let score = 0;

  if (label === requestedTitle) {
    score += 100;
  }

  if (
    matchedText ===
      requestedTitle
  ) {
    score += 40;
  }

  if (
    /\b(song|single)\b/i.test(
      result.description ?? ''
    )
  ) {
    score += 50;
  }

  if (
    requestedArtist &&
    description.includes(
      requestedArtist
    )
  ) {
    score += 60;
  }

  if (
    /\b(album|studio album|film|episode|tour|concert|book|video game)\b/i.test(
      result.description ?? ''
    )
  ) {
    score -= 100;
  }

  return score;
}

async function findWikidataSong(
  songTitle: string,
  artistName: string
): Promise<WikidataSearchResult | null> {
  const url =
    new URL(
      WIKIDATA_API_URL
    );

  url.searchParams.set(
    'action',
    'wbsearchentities'
  );
  url.searchParams.set(
    'search',
    songTitle
  );
  url.searchParams.set(
    'language',
    'en'
  );
  url.searchParams.set(
    'format',
    'json'
  );
  url.searchParams.set(
    'limit',
    '12'
  );

  const data =
    await fetchJson<WikidataSearchResponse>(
      url
    );

  const ranked =
    [...(data.search ?? [])]
      .map((result) => ({
        result,
        score:
          getSongSearchResultScore(
            result,
            songTitle,
            artistName
          ),
      }))
      .sort(
        (
          first,
          second
        ) =>
          second.score -
          first.score
      );

  const best =
    ranked[0];

  if (
    !best ||
    !best.result.id ||
    best.score < 140
  ) {
    return null;
  }

  return best.result;
}

async function getWikidataEntity(
  entityId: string
): Promise<WikidataEntity | null> {
  const url =
    new URL(
      WIKIDATA_API_URL
    );

  url.searchParams.set(
    'action',
    'wbgetentities'
  );
  url.searchParams.set(
    'ids',
    entityId
  );
  url.searchParams.set(
    'props',
    'labels|descriptions|claims|sitelinks'
  );
  url.searchParams.set(
    'languages',
    'en'
  );
  url.searchParams.set(
    'sitefilter',
    'enwiki'
  );
  url.searchParams.set(
    'format',
    'json'
  );

  const data =
    await fetchJson<WikidataEntitiesResponse>(
      url
    );

  return (
    data.entities?.[
      entityId
    ] ?? null
  );
}

function getClaimItemIds(
  entity: WikidataEntity,
  propertyId: string
): string[] {
  const claims =
    entity.claims?.[
      propertyId
    ] ?? [];

  const ids: string[] = [];

  for (const claim of claims) {
    const value =
      claim.mainsnak
        ?.datavalue
        ?.value;

    if (
      value &&
      typeof value ===
        'object' &&
      'id' in value &&
      typeof (
        value as {
          id?: unknown;
        }
      ).id === 'string'
    ) {
      ids.push(
        (
          value as {
            id: string;
          }
        ).id
      );
    }
  }

  return ids;
}

function getClaimYear(
  entity: WikidataEntity,
  propertyId: string
): string | null {
  const claim =
    entity.claims?.[
      propertyId
    ]?.[0];

  const value =
    claim?.mainsnak
      ?.datavalue
      ?.value;

  if (
    !value ||
    typeof value !==
      'object' ||
    !('time' in value)
  ) {
    return null;
  }

  const time =
    (
      value as {
        time?: unknown;
      }
    ).time;

  if (
    typeof time !==
    'string'
  ) {
    return null;
  }

  const match =
    time.match(
      /^[+-](\d{4})/
    );

  return (
    match?.[1] ?? null
  );
}

async function resolveEntityLabels(
  entityIds: string[]
): Promise<
  Record<string, string>
> {
  const uniqueIds =
    [...new Set(entityIds)]
      .filter(Boolean);

  if (
    uniqueIds.length === 0
  ) {
    return {};
  }

  const url =
    new URL(
      WIKIDATA_API_URL
    );

  url.searchParams.set(
    'action',
    'wbgetentities'
  );
  url.searchParams.set(
    'ids',
    uniqueIds.join('|')
  );
  url.searchParams.set(
    'props',
    'labels'
  );
  url.searchParams.set(
    'languages',
    'en'
  );
  url.searchParams.set(
    'format',
    'json'
  );

  const data =
    await fetchJson<WikidataEntitiesResponse>(
      url
    );

  const labels:
    Record<string, string> =
      {};

  for (
    const entityId of
    uniqueIds
  ) {
    const label =
      data.entities?.[
        entityId
      ]?.labels?.en
        ?.value;

    if (label) {
      labels[entityId] =
        label;
    }
  }

  return labels;
}

async function resolveClaimedAlbumName(
  entity: WikidataEntity
): Promise<string | null> {
  const parentIds =
    getClaimItemIds(
      entity,
      'P361'
    ).slice(0, 4);

  for (
    const parentId of
    parentIds
  ) {
    const parentEntity =
      await getWikidataEntity(
        parentId
      );

    if (!parentEntity) {
      continue;
    }

    const description =
      parentEntity.descriptions
        ?.en?.value ?? '';

    if (
      !/\b(album|studio album|live album|compilation album|extended play|EP|mixtape)\b/i.test(
        description
      )
    ) {
      continue;
    }

    const label =
      parentEntity.labels
        ?.en?.value
        ?.trim();

    if (label) {
      return label;
    }
  }

  return null;
}

async function getWikipediaExtract(
  title: string
): Promise<string> {
  const url =
    new URL(
      WIKIPEDIA_API_URL
    );

  url.searchParams.set(
    'action',
    'query'
  );
  url.searchParams.set(
    'prop',
    'extracts'
  );
  url.searchParams.set(
    'exintro',
    '1'
  );
  url.searchParams.set(
    'explaintext',
    '1'
  );
  url.searchParams.set(
    'titles',
    title
  );
  url.searchParams.set(
    'format',
    'json'
  );
  url.searchParams.set(
    'formatversion',
    '2'
  );

  const data =
    await fetchJson<WikipediaExtractResponse>(
      url
    );

  const page =
    data.query?.pages?.[0];

  if (
    !page ||
    page.missing ||
    !page.extract
  ) {
    return '';
  }

  return normalizeWhitespace(
    page.extract
  );
}

function getSentences(
  extract: string
): string[] {
  return extract
    .split(
      /(?<=[.!?])\s+(?=[A-Z])/
    )
    .map(
      normalizeWhitespace
    )
    .filter(Boolean);
}

function getWikipediaDescriptor(
  artistName: string,
  extract: string
): string {
  const firstSentence =
    getSentences(
      extract
    )[0];

  if (!firstSentence) {
    return '';
  }

  const escapedName =
    artistName.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

  const match =
    firstSentence.match(
      new RegExp(
        `^${escapedName}(?:\\s+[^)]*\\))?\\s+(?:is|are)\\s+(?:an?|the)\\s+(.+?)(?=\\s+(?:formed|founded|established|based|born)\\b|[.;])`,
        'i'
      )
    );

  return cleanDescription(
    match?.[1]
  );
}

function extractFormationPlace(
  extract: string
): string | null {
  const firstSentence =
    getSentences(
      extract
    )[0] ?? '';

  const match =
    firstSentence.match(
      /\bformed in (.+?)(?=,\s*in\s+\d{4}\b|\s+in\s+\d{4}\b|,\s+and\s+now\b|\s+and\s+now\b|[.;])/i
    );

  if (!match?.[1]) {
    return null;
  }

  const place =
    normalizeWhitespace(
      match[1]
    );

  const parts =
    place
      .split(',')
      .map(
        (part) =>
          part.trim()
      )
      .filter(Boolean);

  if (
    parts.length === 2
  ) {
    return parts[1];
  }

  return place;
}

function extractCurrentBase(
  extract: string
): string | null {
  const firstSentence =
    getSentences(
      extract
    )[0] ?? '';

  const match =
    firstSentence.match(
      /\bnow based in (.+?)(?=[.;])/i
    );

  if (!match?.[1]) {
    return null;
  }

  return (
    match[1]
      .split(',')[0]
      ?.trim() || null
  );
}

function extractTraits(
  extract: string
): string[] {
  const lower =
    extract.toLowerCase();

  const traits:
    string[] = [];

  const add = (
    trait: string
  ) => {
    if (
      !traits.includes(
        trait
      )
    ) {
      traits.push(trait);
    }
  };

  if (
    /\bautobiographical songwriting\b/.test(
      lower
    )
  ) {
    add(
      'autobiographical songwriting'
    );
  } else if (
    /\bsongwriting\b/.test(
      lower
    )
  ) {
    add('songwriting');
  }

  if (
    /\bvocal ability\b|\bvocal abilities\b|\bpowerful vocals\b/.test(
      lower
    )
  ) {
    add('vocals');
  }

  if (
    /\bartistic reinvention|\breinvent(?:ed|ion|ions|ing)\b/.test(
      lower
    )
  ) {
    add(
      'artistic reinvention'
    );
  }

  if (
    /\benergetic live shows\b|\blive performances?\b|\blive shows?\b/.test(
      lower
    )
  ) {
    add(
      'live performances'
    );
  }

  if (
    /\bexperimental\b|\bexperimentation\b/.test(
      lower
    )
  ) {
    add(
      'musical experimentation'
    );
  }

  if (
    /\bvisual albums?\b/.test(
      lower
    )
  ) {
    add('visual albums');
  }

  return traits.slice(0, 3);
}

function extractNotableSongTitles(
  extract: string
): string[] {
  const sentences =
    getSentences(
      extract
    );

  const titles:
    string[] = [];

  for (
    const sentence of
    sentences
  ) {
    if (
      !/\b(hit|single|singles|song|songs)\b/i.test(
        sentence
      )
    ) {
      continue;
    }

    const matches =
      sentence.matchAll(
        /"([^"]{1,80})"/g
      );

    for (
      const match of
      matches
    ) {
      const title =
        match[1]?.trim();

      if (
        title &&
        !titles.includes(
          title
        )
      ) {
        titles.push(title);
      }

      if (
        titles.length >= 3
      ) {
        return titles;
      }
    }
  }

  return titles;
}

function chooseByline(
  candidates: string[]
): string | null {
  const normalized =
    candidates
      .map(
        (candidate) =>
          normalizeWhitespace(
            candidate
          )
      )
      .map(
        capitalizeFirst
      )
      .map(
        (candidate) =>
          candidate.endsWith('.')
            ? candidate
            : `${candidate}.`
      )
      .filter(
        (candidate) =>
          candidate.length >
          20
      );

  const fitting =
    normalized.find(
      (candidate) =>
        candidate.length <=
        MAX_BYLINE_LENGTH
    );

  if (fitting) {
    return fitting;
  }

  const shortest =
    [...normalized].sort(
      (
        first,
        second
      ) =>
        first.length -
        second.length
    )[0];

  if (!shortest) {
    return null;
  }

  if (
    shortest.length <=
    MAX_BYLINE_LENGTH
  ) {
    return shortest;
  }

  const sliced =
    shortest
      .slice(
        0,
        MAX_BYLINE_LENGTH -
          1
      )
      .replace(
        /\s+\S*$/,
        ''
      )
      .replace(
        /[,;:\s]+$/,
        ''
      );

  return `${sliced}.`;
}

function buildPersonByline(
  description: string,
  birthPlace: string | null,
  traits: string[],
  songs: string[],
  bandName: string | null
): string | null {
  const base =
    stripTrailingPeriod(
      description
    );

  if (!base) {
    return null;
  }

  const bandPhrase =
    bandName &&
    !normalizeName(base).includes(normalizeName(bandName))
      ? `known for work with ${bandName}`
      : '';

  const locationPhrase =
    birthPlace
      ? `${base} born in ${birthPlace}`
      : base;

  const traitPhrase =
    traits.length > 0
      ? `known for ${joinNatural(
          traits
        )}`
      : '';

  const songPhrase =
    songs.length > 0
      ? `songs including ${joinNatural(
          songs
            .slice(0, 2)
            .map(
              quoteTitle
            )
        )}`
      : '';

  return chooseByline([
    ...(bandPhrase
      ? [`${base}, ${bandPhrase}`]
      : []),
    [
      locationPhrase,
      traitPhrase,
      songPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    [
      locationPhrase,
      traitPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    [
      base,
      traitPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    locationPhrase,
    base,
  ]);
}

function buildGroupByline(
  description: string,
  formationYear: string | null,
  formationPlace: string | null,
  currentBase: string | null,
  traits: string[],
  songs: string[]
): string | null {
  const base =
    stripTrailingPeriod(
      description
    );

  if (!base) {
    return null;
  }

  const formationPhrase =
    formationYear
      ? `formed${
          formationPlace
            ? ` in ${formationPlace}`
            : ''
        } in ${formationYear}`
      : formationPlace
        ? `formed in ${formationPlace}`
        : '';

  const basePhrase =
    currentBase
      ? `now based in ${currentBase}`
      : '';

  const traitPhrase =
    traits.length > 0
      ? `known for ${joinNatural(
          traits
        )}`
      : '';

  const songPhrase =
    songs.length > 0
      ? `songs like ${joinNatural(
          songs
            .slice(0, 2)
            .map(
              quoteTitle
            )
        )}`
      : '';

  return chooseByline([
    [
      base,
      formationPhrase,
      basePhrase,
      traitPhrase,
      songPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    [
      base,
      formationYear
        ? `formed in ${formationYear}`
        : formationPhrase,
      basePhrase,
      traitPhrase,
      songPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    [
      base,
      formationYear
        ? `formed in ${formationYear}`
        : formationPhrase,
      traitPhrase,
      songPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    [
      base,
      formationPhrase,
      traitPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    [
      base,
      traitPhrase,
      songPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    [
      base,
      traitPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    base,
  ]);
}

function buildAlbumByline(
  artistName: string,
  releaseYear: string | null,
  description: string,
  producers: string[],
  songs: string[]
): string | null {
  const cleanedDescription =
    stripTrailingPeriod(
      description
    );

  const albumType =
    /\bdebut studio album\b/i.test(
      cleanedDescription
    )
      ? 'debut studio album'
      : /\bstudio album\b/i.test(
            cleanedDescription
          )
        ? 'studio album'
        : /\blive album\b/i.test(
              cleanedDescription
            )
          ? 'live album'
          : /\bcompilation album\b/i.test(
                cleanedDescription
              )
            ? 'compilation album'
            : /\bmixtape\b/i.test(
                  cleanedDescription
                )
              ? 'mixtape'
              : /\bextended play\b|\bEP\b/.test(
                    cleanedDescription
                  )
                ? 'EP'
                : 'album';

  const base =
    [
      releaseYear,
      albumType,
      artistName
        ? `by ${artistName}`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

  const producerPhrase =
    producers.length > 0
      ? `produced by ${joinNatural(
          producers.slice(0, 2)
        )}`
      : '';

  const songPhrase =
    songs.length > 0
      ? `featuring ${joinNatural(
          songs
            .slice(0, 2)
            .map(
              quoteTitle
            )
        )}`
      : '';

  return chooseByline([
    [
      base,
      producerPhrase,
      songPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    [
      base,
      songPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    [
      base,
      producerPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    base,
  ]);
}

function buildMetadataByline(
  entityKind: 'album' | 'song',
  artistName: string,
  releaseYear?: string,
  albumName?: string
): string | null {
  if (!artistName) {
    return null;
  }

  let byline = '';

  if (entityKind === 'album') {
    if (!releaseYear) {
      return null;
    }

    byline =
      `${releaseYear} album by ${artistName}`;
  } else {
    if (
      !releaseYear &&
      !albumName
    ) {
      return null;
    }

    const albumPhrase =
      albumName
        ? ` available on the album ${quoteTitle(
            albumName
          )}`
        : '';

    byline =
      [
        releaseYear,
        `song by ${artistName}${albumPhrase}`,
      ]
        .filter(Boolean)
        .join(' ');
  }

  const normalized =
    capitalizeFirst(
      normalizeWhitespace(
        byline
      )
    );

  if (!normalized) {
    return null;
  }

  if (
    normalized.length <=
    MAX_BYLINE_LENGTH
  ) {
    return normalized.endsWith('.')
      ? normalized
      : `${normalized}.`;
  }

  const sliced =
    normalized
      .slice(
        0,
        MAX_BYLINE_LENGTH -
          1
      )
      .replace(
        /\s+\S*$/,
        ''
      )
      .replace(
        /[,;:\s]+$/,
        ''
      );

  return `${sliced}.`;
}

function buildSongByline(
  artistName: string,
  releaseYear: string | null,
  albumName: string | null,
  albumRelationship:
    | 'from'
    | 'available',
  description: string
): string | null {
  const cleanedDescription =
    stripTrailingPeriod(
      description
    );

  const songType =
    /\bsingle\b/i.test(
      cleanedDescription
    )
      ? 'single'
      : 'song';

  const base =
    [
      releaseYear,
      `${songType} by ${artistName}`,
    ]
      .filter(Boolean)
      .join(' ');

  const albumPhrase =
    albumName
      ? albumRelationship ===
          'from'
        ? `from the album ${quoteTitle(
            albumName
          )}`
        : `available on the album ${quoteTitle(
            albumName
          )}`
      : '';

  return chooseByline([
    [
      base,
      albumPhrase,
    ]
      .filter(Boolean)
      .join(', '),

    base,
  ]);
}

async function generateSongByline(
  songTitle: string,
  artistName: string,
  fallbackReleaseYear?: string,
  fallbackAlbumName?: string
): Promise<{
  byline: string;
  sourceEntityId: string;
  sourceProvider: string;
} | null> {
  const searchResult =
    await findWikidataSong(
      songTitle,
      artistName
    );

  if (!searchResult?.id) {
    return null;
  }

  const entity =
    await getWikidataEntity(
      searchResult.id
    );

  if (!entity) {
    return null;
  }

  const wikipediaTitle =
    entity.sitelinks
      ?.enwiki?.title;

  let wikipediaExtract =
    '';

  if (wikipediaTitle) {
    try {
      wikipediaExtract =
        await getWikipediaExtract(
          wikipediaTitle
        );
    } catch (error) {
      console.error(
        'Wikipedia song lookup failed:',
        error
      );
    }
  }

  const description =
    cleanDescription(
      entity.descriptions
        ?.en?.value ??
      searchResult.description
    );

  const releaseYear =
    getClaimYear(
      entity,
      'P577'
    ) ??
    fallbackReleaseYear ??
    null;

  const claimedAlbumName =
    await resolveClaimedAlbumName(
      entity
    );

  const albumName =
    claimedAlbumName ??
    fallbackAlbumName ??
    null;

  const albumRelationship =
    claimedAlbumName
      ? 'from' as const
      : 'available' as const;

  const byline =
    buildSongByline(
      artistName,
      releaseYear,
      albumName,
      albumRelationship,
      description
    );

  if (!byline) {
    return null;
  }

  return {
    byline,
    sourceEntityId:
      searchResult.id,
    sourceProvider:
      wikipediaExtract
        ? 'wikidata+wikipedia'
        : 'wikidata',
  };
}

async function generateAlbumByline(
  albumTitle: string,
  artistName: string,
  fallbackReleaseYear?: string
): Promise<{
  byline: string;
  sourceEntityId: string;
  sourceProvider: string;
} | null> {
  const searchResult =
    await findWikidataAlbum(
      albumTitle,
      artistName
    );

  if (!searchResult?.id) {
    return null;
  }

  const entity =
    await getWikidataEntity(
      searchResult.id
    );

  if (!entity) {
    return null;
  }

  const wikipediaTitle =
    entity.sitelinks
      ?.enwiki?.title;

  let wikipediaExtract =
    '';

  if (wikipediaTitle) {
    try {
      wikipediaExtract =
        await getWikipediaExtract(
          wikipediaTitle
        );
    } catch (error) {
      console.error(
        'Wikipedia album lookup failed:',
        error
      );
    }
  }

  const description =
    cleanDescription(
      entity.descriptions
        ?.en?.value ??
      searchResult.description
    );

  const releaseYear =
    getClaimYear(
      entity,
      'P577'
    ) ??
    fallbackReleaseYear ??
    null;

  const producerIds =
    getClaimItemIds(
      entity,
      'P162'
    );

  const producerLabels =
    await resolveEntityLabels(
      producerIds.slice(
        0,
        2
      )
    );

  const producers =
    producerIds
      .slice(0, 2)
      .map(
        (producerId) =>
          producerLabels[
            producerId
          ]
      )
      .filter(
        (
          producer
        ): producer is string =>
          Boolean(producer)
      );

  const songs =
    extractNotableSongTitles(
      wikipediaExtract
    );

  const byline =
    buildAlbumByline(
      artistName,
      releaseYear,
      description,
      producers,
      songs
    );

  if (!byline) {
    return null;
  }

  return {
    byline,
    sourceEntityId:
      searchResult.id,
    sourceProvider:
      wikipediaExtract
        ? 'wikidata+wikipedia'
        : 'wikidata',
  };
}

async function generateArtistByline(
  artistName: string
): Promise<{
  byline: string;
  sourceArtistId: string;
  sourceProvider: string;
} | null> {
  const searchResult =
    await findWikidataArtist(
      artistName
    );

  if (!searchResult?.id) {
    return null;
  }

  const entity =
    await getWikidataEntity(
      searchResult.id
    );

  if (!entity) {
    return null;
  }

  const instanceOfIds =
    getClaimItemIds(
      entity,
      'P31'
    );

  const isPerson =
    instanceOfIds.includes(
      PERSON_ENTITY_ID
    );

  const wikipediaTitle =
    entity.sitelinks
      ?.enwiki?.title;

  let wikipediaExtract =
    '';

  if (wikipediaTitle) {
    try {
      wikipediaExtract =
        await getWikipediaExtract(
          wikipediaTitle
        );
    } catch (error) {
      console.error(
        'Wikipedia lookup failed:',
        error
      );
    }
  }

  const wikidataDescription =
    cleanDescription(
      entity.descriptions
        ?.en?.value ??
        searchResult.description
    );

  const wikipediaDescription =
    getWikipediaDescriptor(
      artistName,
      wikipediaExtract
    );

  const description =
    wikipediaDescription ||
    wikidataDescription;

  if (!description) {
    return null;
  }

  const traits =
    extractTraits(
      wikipediaExtract
    );

  const songs =
    extractNotableSongTitles(
      wikipediaExtract
    );

  if (isPerson) {
    const birthPlaceIds =
      getClaimItemIds(
        entity,
        'P19'
      );

    const bandIds =
      getClaimItemIds(
        entity,
        'P463'
      ).slice(0, 10);

    const labels =
      await resolveEntityLabels([
        ...birthPlaceIds.slice(0, 1),
        ...bandIds,
      ]);

    const introduction =
      wikipediaExtract.slice(0, 900).toLowerCase();

    const bandName =
      bandIds
        .map((id) => labels[id])
        .filter(
          (name): name is string =>
            Boolean(name) &&
            introduction.includes(name.toLowerCase())
        )
        .sort(
          (a, b) =>
            introduction.indexOf(a.toLowerCase()) -
            introduction.indexOf(b.toLowerCase())
        )[0] ?? null;

    const birthPlaceId =
      birthPlaceIds[0];

    const birthPlace =
      birthPlaceId
        ? labels[
            birthPlaceId
          ] ?? null
        : null;

    const byline =
      buildPersonByline(
        wikidataDescription ||
          description,
        birthPlace,
        traits,
        songs,
        bandName
      );

    if (!byline) {
      return null;
    }

    return {
      byline,
      sourceArtistId:
        searchResult.id,
      sourceProvider:
        wikipediaExtract
          ? 'wikidata+wikipedia'
          : 'wikidata',
    };
  }

  const formationYear =
    getClaimYear(
      entity,
      'P571'
    );

  let formationPlace =
    extractFormationPlace(
      wikipediaExtract
    );

  let currentBase =
    extractCurrentBase(
      wikipediaExtract
    );

  if (!formationPlace) {
    const formationPlaceIds =
      getClaimItemIds(
        entity,
        'P740'
      );

    const labels =
      await resolveEntityLabels(
        formationPlaceIds.slice(
          0,
          1
        )
      );

    const formationPlaceId =
      formationPlaceIds[0];

    formationPlace =
      formationPlaceId
        ? labels[
            formationPlaceId
          ] ?? null
        : null;
  }

  if (
    currentBase &&
    formationPlace &&
    normalizeName(
      currentBase
    ) ===
      normalizeName(
        formationPlace
      )
  ) {
    currentBase = null;
  }

  const byline =
    buildGroupByline(
      wikipediaDescription ||
        wikidataDescription,
      formationYear,
      formationPlace,
      currentBase,
      traits,
      songs
    );

  if (!byline) {
    return null;
  }

  return {
    byline,
    sourceArtistId:
      searchResult.id,
    sourceProvider:
      wikipediaExtract
        ? 'wikidata+wikipedia'
        : 'wikidata',
  };
}

export default {
  fetch: withSupabase(
    {
      auth: 'user',
    },
    async (
      request: Request,
      ctx
    ) => {
      try {
        if (
          request.method !==
          'POST'
        ) {
          return jsonResponse(
            {
              error:
                'Method not allowed.',
            },
            405
          );
        }

        const supabaseAdmin =
          ctx.supabaseAdmin as any;

        let body:
          MediaPreviewBylineRequestBody;

        try {
          body =
            (await request.json()) as
              MediaPreviewBylineRequestBody;
        } catch {
          return jsonResponse(
            {
              error:
                'Invalid request body.',
            },
            400
          );
        }

        const requestedEntityKind =
          typeof body.entityKind ===
          'string'
            ? body.entityKind.trim()
            : '';

        const entityKind:
          | 'artist'
          | 'album'
          | 'song'
          | null =
          requestedEntityKind ===
          'artist' ||
          requestedEntityKind ===
          'album' ||
          requestedEntityKind ===
          'song'
            ? requestedEntityKind
            : !requestedEntityKind &&
                typeof body.appleMusicArtistId ===
                  'string'
              ? 'artist'
              : null;

        if (!entityKind) {
          return jsonResponse(
            {
              error:
                'A supported media entity kind is required.',
            },
            400
          );
        }

        const legacyArtistId =
          typeof body.appleMusicArtistId ===
          'string'
            ? body.appleMusicArtistId.trim()
            : '';

        const appleMusicItemId =
          typeof body.appleMusicItemId ===
          'string'
            ? body.appleMusicItemId.trim()
            : entityKind === 'artist'
              ? legacyArtistId
              : '';

        const artistName =
          typeof body.artistName ===
          'string'
            ? normalizeWhitespace(
                body.artistName
              )
            : '';

        const title =
          typeof body.title ===
          'string'
            ? normalizeWhitespace(
                body.title
              )
            : entityKind === 'artist'
              ? artistName
              : '';

        const appleMusicArtistId =
          entityKind === 'artist'
            ? appleMusicItemId
            : legacyArtistId;

        const releaseYear =
          typeof body.releaseYear ===
            'string' &&
          /^\d{4}$/.test(
            body.releaseYear.trim()
          )
            ? body.releaseYear.trim()
            : undefined;

        const albumName =
          typeof body.albumName ===
          'string'
            ? normalizeWhitespace(
                body.albumName
              )
            : '';

        if (
          !isValidAppleMusicId(
            appleMusicItemId
          ) ||
          !title ||
          title.length >
            MAX_MEDIA_TITLE_LENGTH ||
          (
            artistName &&
            artistName.length >
              MAX_ARTIST_NAME_LENGTH
          ) ||
          (
            albumName &&
            albumName.length >
              MAX_ALBUM_NAME_LENGTH
          ) ||
          !artistName
        ) {
          return jsonResponse(
            {
              error:
                'Valid Apple Music media details are required.',
            },
            400
          );
        }

        const expectedGeneratorVersion =
          GENERATOR_VERSION;

        const {
          data: cachedData,
          error: cacheError,
        } =
          await supabaseAdmin
            .from(
              'media_preview_bylines'
            )
            .select(
              'apple_music_item_id,entity_kind,title,artist_name,album_name,byline,byline_kind,source_provider,source_entity_id,generator_provider,generator_model,generator_version,manually_edited'
            )
            .eq(
              'entity_kind',
              entityKind
            )
            .eq(
              'apple_music_item_id',
              appleMusicItemId
            )
            .maybeSingle();

        if (cacheError) {
          console.error(
            'Failed to read media preview byline cache:',
            cacheError
          );

          return jsonResponse(
            {
              error:
                'Media preview byline is temporarily unavailable.',
            },
            500
          );
        }

        const cached =
          cachedData as
            | MediaPreviewBylineRow
            | null;

        if (
          cached &&
          (
            cached.manually_edited ||
            cached.generator_version ===
              expectedGeneratorVersion
          )
        ) {
          return jsonResponse({
            byline:
              cached.byline,
            kind:
              cached.byline_kind,
            cached: true,
          });
        }

        let generated:
          | {
              byline: string;
              sourceProvider: string;
              sourceEntityId:
                | string
                | null;
              bylineKind:
                MediaPreviewBylineKind;
            }
          | null = null;

        if (
          entityKind ===
          'artist'
        ) {
          try {
            const artistGenerated =
              await generateArtistByline(
                artistName
              );

            if (artistGenerated) {
              generated = {
                byline:
                  artistGenerated.byline,
                sourceProvider:
                  artistGenerated.sourceProvider,
                sourceEntityId:
                  artistGenerated.sourceArtistId,
                bylineKind:
                  'item',
              };
            }
          } catch (error) {
            console.error(
              'Failed to generate artist preview byline:',
              error
            );
          }
        } else {
          try {
            const itemGenerated =
              entityKind ===
                'album'
                ? await generateAlbumByline(
                    title,
                    artistName,
                    releaseYear
                  )
                : await generateSongByline(
                    title,
                    artistName,
                    releaseYear,
                    albumName ||
                      undefined
                  );

            if (itemGenerated) {
              generated = {
                byline:
                  itemGenerated.byline,
                sourceProvider:
                  itemGenerated.sourceProvider,
                sourceEntityId:
                  itemGenerated.sourceEntityId,
                bylineKind:
                  'item',
              };
            }
          } catch (error) {
            console.error(
              `Failed to generate ${entityKind} preview byline:`,
              error
            );
          }

          if (!generated) {
            const metadataByline =
              buildMetadataByline(
                entityKind,
                artistName,
                releaseYear,
                entityKind ===
                  'song'
                  ? albumName ||
                    undefined
                  : undefined
              );

            if (metadataByline) {
              generated = {
                byline:
                  metadataByline,
                sourceProvider:
                  'apple-music',
                sourceEntityId:
                  null,
                bylineKind:
                  'metadata',
              };
            }
          }

          if (
            !generated &&
            artistName
          ) {
            let artistFallback:
              | {
                  byline: string;
                  sourceProvider: string;
                  sourceEntityId:
                    | string
                    | null;
                }
              | null = null;

            if (
              isValidAppleMusicId(
                appleMusicArtistId
              )
            ) {
              const {
                data:
                  cachedArtistData,
                error:
                  cachedArtistError,
              } =
                await supabaseAdmin
                  .from(
                    'media_preview_bylines'
                  )
                  .select(
                    'byline,source_provider,source_entity_id,generator_version,manually_edited'
                  )
                  .eq(
                    'entity_kind',
                    'artist'
                  )
                  .eq(
                    'apple_music_item_id',
                    appleMusicArtistId
                  )
                  .maybeSingle();

              if (
                cachedArtistError
              ) {
                console.warn(
                  'Failed to read artist fallback cache:',
                  cachedArtistError
                );
              } else if (
                cachedArtistData &&
                (
                  cachedArtistData.manually_edited ||
                  cachedArtistData.generator_version ===
                    GENERATOR_VERSION
                )
              ) {
                artistFallback = {
                  byline:
                    cachedArtistData.byline,
                  sourceProvider:
                    cachedArtistData.source_provider ??
                    'artist-preview-cache',
                  sourceEntityId:
                    cachedArtistData.source_entity_id ??
                    appleMusicArtistId,
                };
              }
            }

            if (
              !artistFallback
            ) {
              try {
                const artistGenerated =
                  await generateArtistByline(
                    artistName
                  );

                if (artistGenerated) {
                  artistFallback = {
                    byline:
                      artistGenerated.byline,
                    sourceProvider:
                      artistGenerated.sourceProvider,
                    sourceEntityId:
                      artistGenerated.sourceArtistId,
                  };
                }
              } catch (error) {
                console.error(
                  'Failed to generate artist fallback byline:',
                  error
                );
              }
            }

            if (artistFallback) {
              generated = {
                ...artistFallback,
                bylineKind:
                  'artist_fallback',
              };
            }
          }
        }

        if (!generated) {
          return jsonResponse({
            byline: null,
            kind: null,
            cached: false,
            reason:
              'not_found',
          });
        }

        const row = {
          apple_music_item_id:
            appleMusicItemId,
          entity_kind:
            entityKind,
          title,
          artist_name:
            entityKind ===
              'artist'
              ? title
              : artistName ||
                null,
          album_name:
            entityKind ===
              'album'
              ? title
              : albumName ||
                null,
          byline:
            generated.byline,
          byline_kind:
            generated.bylineKind,
          source_provider:
            generated.sourceProvider,
          source_entity_id:
            generated.sourceEntityId,
          generator_provider:
            'top3',
          generator_model:
            'deterministic-template',
          generator_version:
            expectedGeneratorVersion,
          manually_edited:
            false,
        };

        const persistenceQuery =
          cached
            ? supabaseAdmin
                .from(
                  'media_preview_bylines'
                )
                .update(row)
                .eq(
                  'entity_kind',
                  entityKind
                )
                .eq(
                  'apple_music_item_id',
                  appleMusicItemId
                )
                .eq(
                  'manually_edited',
                  false
                )
            : supabaseAdmin
                .from(
                  'media_preview_bylines'
                )
                .insert(row);

        const {
          data: persistedData,
          error: persistenceError,
        } =
          await persistenceQuery
            .select(
              'apple_music_item_id,entity_kind,title,artist_name,album_name,byline,byline_kind,source_provider,source_entity_id,generator_provider,generator_model,generator_version,manually_edited'
            )
            .maybeSingle();

        if (
          !persistenceError &&
          persistedData
        ) {
          const persisted =
            persistedData as
              MediaPreviewBylineRow;

          return jsonResponse({
            byline:
              persisted.byline,
            kind:
              persisted.byline_kind,
            cached: false,
          });
        }

        if (persistenceError) {
          console.warn(
            'Media preview byline persistence did not complete; checking for concurrent cache write:',
            persistenceError
          );
        }

        const {
          data: concurrentData,
          error:
            concurrentError,
        } =
          await supabaseAdmin
            .from(
              'media_preview_bylines'
            )
            .select(
              'byline,byline_kind'
            )
            .eq(
              'entity_kind',
              entityKind
            )
            .eq(
              'apple_music_item_id',
              appleMusicItemId
            )
            .maybeSingle();

        if (
          concurrentError ||
          !concurrentData
        ) {
          console.error(
            'Failed to persist media preview byline:',
            persistenceError ??
              concurrentError
          );

          return jsonResponse(
            {
              error:
                'Media preview byline is temporarily unavailable.',
            },
            500
          );
        }

        return jsonResponse({
          byline:
            (
              concurrentData as {
                byline: string;
                byline_kind:
                  MediaPreviewBylineKind;
              }
            ).byline,
          kind:
            (
              concurrentData as {
                byline: string;
                byline_kind:
                  MediaPreviewBylineKind;
              }
            ).byline_kind,
          cached: true,
        });
      } catch (error) {
        console.error(
          'Media preview byline Edge Function failed:',
          error
        );

        return jsonResponse(
          {
            error:
              'Media preview byline is temporarily unavailable.',
          },
          500
        );
      }
    }
  ),
};
