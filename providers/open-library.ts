import { Top3Item } from '@/types/top3-item';

type OpenLibraryDocument = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibraryDocument[];
};

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';

export async function searchOpenLibrary(
  query: string,
  topic?: string
): Promise<Top3Item[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const topicQuery = topic ? ` subject:${topic}` : '';
  const fullQuery = `${trimmedQuery}${topicQuery}`;

  const requestUrl =
    `${OPEN_LIBRARY_SEARCH_URL}?q=${encodeURIComponent(fullQuery)}` +
    `&fields=key,title,author_name,first_publish_year,cover_i` +
    `&limit=10`;

  const response = await fetch(requestUrl);

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Open Library request failed: ${response.status}\n${errorBody}`
    );
  }

  const data = (await response.json()) as OpenLibrarySearchResponse;

  return (data.docs ?? [])
    .filter((book) => book.key && book.title)
    .map((book) => {
      const authors =
        book.author_name?.join(', ') ?? 'Author unknown';

      const subtitle = book.first_publish_year
        ? `${authors} · ${book.first_publish_year}`
        : authors;

      const imageUrl = book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : undefined;

      return {
        id: book.key!,
        title: book.title!,
        subtitle,
        imageUrl,
      };
    });
}