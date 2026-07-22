import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { Top3Item } from '@/types/top3-item';

type RawgGame = {
  id: number;
  name: string;
  released?: string;
  background_image?: string;
  rating?: number;
  genres?: {
    id: number;
    name: string;
  }[];
};

type RawgResponse = {
  results?: RawgGame[];
};

const API_BASE_URL = 'https://api.rawg.io/api';
const API_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;

function getRawgGenreId(topic?: string) {
  if (!topic) {
    return undefined;
  }

  const gamesCategory = TOP3_CATEGORIES.find(
    (category) => category.id === 'games'
  );

  const selectedTopic = gamesCategory?.topics.find(
    (item) => item.name.toLowerCase() === topic.toLowerCase()
  );

  return selectedTopic?.rawgGenreId;
}

export async function searchGames(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (!API_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_RAWG_API_KEY in .env'
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/games?key=${API_KEY}` +
      `&search=${encodeURIComponent(trimmedQuery)}` +
      `&page_size=20`
  );

  if (!response.ok) {
    throw new Error(
      `RAWG request failed: ${response.status}`
    );
  }

  const data = (await response.json()) as RawgResponse;

  let games = data.results ?? [];

  const rawgGenreId = getRawgGenreId(topic);

  if (rawgGenreId) {
    games = games.filter((game) =>
      game.genres?.some(
        (genre) => genre.id === rawgGenreId
      )
    );
  }

  return games.slice(0, 10).map((game) => ({
    id: `game-${game.id}`,
    title: game.name,
    subtitle: game.released?.slice(0, 4),
    imageUrl: game.background_image,
    rating: game.rating,
  }));
}