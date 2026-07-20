import { Top3Item } from '@/types/top3-item';

type TMDBMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
};

const MOVIE_GENRE_IDS: Record<string, number> = {
  horror: 27,
  comedy: 35,
  'sci-fi': 878,
};

export async function searchMovies(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  if (!query.trim()) {
    return [];
  }

  const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;

  const response = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
      query
    )}&include_adult=false`
  );

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  const data = await response.json();

  let movies: TMDBMovie[] = data.results ?? [];

  const normalizedTopic = topic?.toLowerCase();
  const genreId = normalizedTopic
    ? MOVIE_GENRE_IDS[normalizedTopic]
    : undefined;

  if (genreId) {
    movies = movies.filter((movie) =>
      movie.genre_ids?.includes(genreId)
    );
  }

  return movies.slice(0, 10).map((movie) => ({
    id: movie.id.toString(),
    title: movie.title,
    subtitle: movie.release_date?.slice(0, 4),
    imageUrl: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : undefined,
    rating: movie.vote_average,
  }));
}