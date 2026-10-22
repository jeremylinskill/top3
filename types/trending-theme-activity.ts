export type TrendingThemeActivityPost = {
  authorId: string;
  publishedAt: string;
  collection: {
    category: string;
    themeId?: string;
    collectionOptionId?: string;
  };
};
