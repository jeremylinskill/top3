// Canonical notification genre slugs mirrored from TOP3_CATEGORIES.topics.
// Installer verifies this list against constants/top3-categories.ts.
// This module is pure TypeScript so Supabase Edge Functions can import it
// without bundling React Native / Ionicons dependencies.
export const NOTIFICATION_GENRE_IDS: Readonly<Record<string, readonly string[]>> =
{
  "albums": [
    "alternative",
    "blues",
    "classical",
    "country",
    "dance",
    "electronic",
    "folk",
    "hip-hop",
    "jazz",
    "latin",
    "metal",
    "pop",
    "r-and-b",
    "reggae",
    "rock"
  ],
  "artists": [
    "alternative",
    "blues",
    "classical",
    "country",
    "dance",
    "electronic",
    "folk",
    "hip-hop",
    "jazz",
    "latin",
    "metal",
    "pop",
    "r-and-b",
    "reggae",
    "rock"
  ],
  "books": [
    "biography",
    "business",
    "childrens",
    "fantasy",
    "fiction",
    "graphic-novel",
    "history",
    "mystery",
    "non-fiction",
    "romance",
    "sci-fi",
    "self-help"
  ],
  "games": [
    "action",
    "adventure",
    "rpg",
    "shooter",
    "strategy",
    "simulation",
    "racing",
    "sports",
    "puzzle"
  ],
  "movies": [
    "action",
    "adventure",
    "comedy",
    "documentary",
    "drama",
    "fantasy",
    "horror",
    "romance",
    "sci-fi",
    "thriller"
  ],
  "songs": [
    "alternative",
    "blues",
    "classical",
    "country",
    "dance",
    "electronic",
    "folk",
    "hip-hop",
    "jazz",
    "latin",
    "metal",
    "pop",
    "r-and-b",
    "reggae",
    "rock"
  ],
  "tv": [
    "comedy",
    "crime",
    "documentary",
    "drama",
    "fantasy",
    "reality",
    "sci-fi",
    "animated"
  ]
};

export function isNotificationGenre(categoryId: unknown, genreId: unknown): boolean {
  return typeof categoryId === "string" && typeof genreId === "string" &&
    (NOTIFICATION_GENRE_IDS[categoryId]?.includes(genreId) ?? false);
}
