const SEARCH_ALIASES: Record<
  string,
  string
> = {
  botw: 'Breath of the Wild',
  totk: 'Tears of the Kingdom',
  cod: 'Call of Duty',
  'gta v': 'Grand Theft Auto V',
  gta5: 'Grand Theft Auto V',
  ff7: 'Final Fantasy VII',
  mario: 'Super Mario',
  zelda: 'The Legend of Zelda',
};

function normalizeAliasKey(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function getSearchAlias(
  query: string
): string | undefined {
  return SEARCH_ALIASES[
    normalizeAliasKey(query)
  ];
}