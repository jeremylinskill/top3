export type CategoryArtworkRule = {
  width: number;
  height: number;
};

export const CATEGORY_ARTWORK_RULES = {
  albums: {
    width: 64,
    height: 64,
  },

  artists: {
    width: 64,
    height: 64,
  },

  books: {
    width: 64,
    height: 96,
  },

  games: {
    width: 64,
    height: 96,
  },

  movies: {
    width: 64,
    height: 96,
  },

  songs: {
    width: 64,
    height: 64,
  },

  tv: {
    width: 64,
    height: 96,
  },
} as const satisfies Record<
  string,
  CategoryArtworkRule
>;

export type CategoryArtworkId =
  keyof typeof CATEGORY_ARTWORK_RULES;

export function getCategoryArtworkRule(
  categoryId: string
): CategoryArtworkRule {
  return (
    CATEGORY_ARTWORK_RULES[
      categoryId as CategoryArtworkId
    ] ?? {
      width: 64,
      height: 96,
    }
  );
}