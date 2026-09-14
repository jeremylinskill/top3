// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const OPEN_LIBRARY_SEARCH_URL =
  "https://openlibrary.org/search.json";

const OPEN_LIBRARY_COVER_BASE_URL =
  "https://covers.openlibrary.org/b/id";

const OPEN_LIBRARY_REQUEST_HEADERS = {
  "User-Agent":
    "Top 3 (support@top3taste.com)",
};

const MAX_COVER_CANDIDATES_TO_CHECK = 2;

type RepairCollectionArtworkRequestBody = {
  collectionId?: unknown;
  itemId?: unknown;
  replaceExisting?: unknown;
};

type CollectionRow = {
  id: string;
  category: string;
  status: string;
  items: unknown;
  published_at: string | null;
  updated_at: string;
};

type CollectionItem = {
  id?: unknown;
  title?: unknown;
  subtitle?: unknown;
  imageUrl?: unknown;
  [key: string]: unknown;
};

type OpenLibraryDocument = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibraryDocument[];
};

function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAuthorText(
  subtitle: unknown
): string {
  if (typeof subtitle !== "string") {
    return "";
  }

  return subtitle
    .split("·")[0]
    .trim();
}

function getOpenLibraryScore(
  document: OpenLibraryDocument,
  title: string,
  author: string
): number {
  if (!document.title || !document.cover_i) {
    return -1;
  }

  const normalizedTitle =
    normalizeText(title);

  const normalizedDocumentTitle =
    normalizeText(document.title);

  if (
    normalizedDocumentTitle !==
    normalizedTitle
  ) {
    return -1;
  }

  const normalizedAuthor =
    normalizeText(author);

  if (!normalizedAuthor) {
    return -1;
  }

  const documentAuthors =
    (document.author_name ?? [])
      .map(normalizeText)
      .filter(Boolean);

  const authorMatches =
    documentAuthors.some(
      (documentAuthor) =>
        documentAuthor ===
          normalizedAuthor ||
        documentAuthor.includes(
          normalizedAuthor
        ) ||
        normalizedAuthor.includes(
          documentAuthor
        )
    );

  if (!authorMatches) {
    return -1;
  }

  return 1000;
}

function buildOpenLibraryCoverUrl(
  coverId: number
): string {
  return (
    `${OPEN_LIBRARY_COVER_BASE_URL}/${coverId}-M.jpg` +
    "?default=false"
  );
}

async function isUsableOpenLibraryCover(
  imageUrl: string
): Promise<boolean> {
  const response =
    await fetch(
      imageUrl,
      {
        headers:
          OPEN_LIBRARY_REQUEST_HEADERS,
      }
    );

  if (response.status === 404) {
    await response.body?.cancel();
    return false;
  }

  if (!response.ok) {
    const status =
      response.status;

    await response.body?.cancel();

    throw new Error(
      `Open Library cover request failed: ${status}`
    );
  }

  const contentType =
    response.headers
      .get("content-type")
      ?.toLowerCase() ?? "";

  await response.body?.cancel();

  return contentType.startsWith(
    "image/"
  );
}

async function findTrustedArtworkUrl(
  title: string,
  author: string
): Promise<string | null> {
  const searchTerms =
    [title, author]
      .filter(Boolean)
      .join(" ");

  const requestUrl =
    `${OPEN_LIBRARY_SEARCH_URL}?q=${encodeURIComponent(
      searchTerms
    )}` +
    `&fields=key,title,author_name,cover_i` +
    `&limit=20`;

  const response =
    await fetch(
      requestUrl,
      {
        headers:
          OPEN_LIBRARY_REQUEST_HEADERS,
      }
    );

  if (!response.ok) {
    const errorBody =
      await response.text();

    throw new Error(
      `Open Library request failed: ${response.status}\n${errorBody}`
    );
  }

  const data =
    (await response.json()) as OpenLibrarySearchResponse;

  const rankedDocuments =
    (data.docs ?? [])
      .map((document) => ({
        document,
        score: getOpenLibraryScore(
          document,
          title,
          author
        ),
      }))
      .filter(
        ({ score }) =>
          score >= 0
      )
      .sort(
        (first, second) =>
          second.score -
          first.score
      );

  const candidateCoverIds =
    Array.from(
      new Set(
        rankedDocuments
          .map(
            ({ document }) =>
              document.cover_i
          )
          .filter(
            (coverId): coverId is number =>
              typeof coverId ===
                "number" &&
              Number.isFinite(coverId)
          )
      )
    ).slice(
      0,
      MAX_COVER_CANDIDATES_TO_CHECK
    );

  for (
    const coverId of candidateCoverIds
  ) {
    const imageUrl =
      buildOpenLibraryCoverUrl(
        coverId
      );

    if (
      await isUsableOpenLibraryCover(
        imageUrl
      )
    ) {
      return imageUrl;
    }
  }

  return null;
}

function parseCollectionItems(
  value: unknown
): CollectionItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.map((item) =>
    item &&
    typeof item === "object"
      ? {
          ...(item as Record<
            string,
            unknown
          >),
        }
      : {}
  );
}

export default {
  fetch: withSupabase(
    {
      auth: "user",
    },
    async (request, ctx) => {
      if (request.method !== "POST") {
        return Response.json(
          {
            error: "Method not allowed.",
          },
          {
            status: 405,
          }
        );
      }

      const userId =
        ctx.userClaims?.id;

      if (!userId) {
        return Response.json(
          {
            error:
              "Authenticated user not found.",
          },
          {
            status: 401,
          }
        );
      }

      /*
       * The Edge Runtime client is not generated
       * with the app's database schema, so keep
       * this cast local to server-only access to
       * the collections table.
       */
      const supabaseAdmin =
        ctx.supabaseAdmin as any;

      let body:
        RepairCollectionArtworkRequestBody =
        {};

      try {
        body =
          await request.json();
      } catch {
        return Response.json(
          {
            error:
              "Invalid JSON request body.",
          },
          {
            status: 400,
          }
        );
      }

      const collectionId =
        typeof body.collectionId ===
        "string"
          ? body.collectionId.trim()
          : "";

      const itemId =
        typeof body.itemId === "string"
          ? body.itemId.trim()
          : "";

      const replaceExisting =
        body.replaceExisting === true;

      if (!collectionId || !itemId) {
        return Response.json(
          {
            error:
              "Collection ID and item ID are required.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: collectionData,
        error: collectionError,
      } = await supabaseAdmin
        .from("collections")
        .select(
          "id,category,status,items,published_at,updated_at"
        )
        .eq("id", collectionId)
        .eq("status", "published")
        .not("published_at", "is", null)
        .is("removed_at", null)
        .maybeSingle();

      if (collectionError) {
        console.error(
          "Failed to load collection for artwork repair:",
          collectionError
        );

        return Response.json(
          {
            error:
              "Failed to load collection.",
          },
          {
            status: 500,
          }
        );
      }

      const collection =
        collectionData as
          | CollectionRow
          | null;

      if (!collection) {
        return Response.json(
          {
            error:
              "Published collection not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        collection.category.trim().toLowerCase() !==
        "books"
      ) {
        return Response.json(
          {
            error:
              "Artwork repair currently supports books only.",
          },
          {
            status: 400,
          }
        );
      }

      const items =
        parseCollectionItems(
          collection.items
        );

      if (!items) {
        return Response.json(
          {
            error:
              "Collection items are invalid.",
          },
          {
            status: 409,
          }
        );
      }

      const itemIndex =
        items.findIndex(
          (item) =>
            item.id === itemId
        );

      if (itemIndex < 0) {
        return Response.json(
          {
            error:
              "Collection item not found.",
          },
          {
            status: 404,
          }
        );
      }

      const item =
        items[itemIndex];

      const existingImageUrl =
        typeof item.imageUrl ===
          "string"
          ? item.imageUrl.trim()
          : "";

      if (
        existingImageUrl &&
        !replaceExisting
      ) {
        return Response.json({
          success: true,
          repaired: false,
          imageUrl:
            existingImageUrl,
          reason:
            "already-has-artwork",
        });
      }

      const title =
        typeof item.title === "string"
          ? item.title.trim()
          : "";

      if (!title) {
        return Response.json(
          {
            error:
              "Collection item title is missing.",
          },
          {
            status: 409,
          }
        );
      }

      const author =
        getAuthorText(
          item.subtitle
        );

      if (!author) {
        return Response.json({
          success: true,
          repaired: false,
          imageUrl: null,
          reason:
            "author-required-for-safe-match",
        });
      }

      let imageUrl: string | null =
        null;

      try {
        imageUrl =
          await findTrustedArtworkUrl(
            title,
            author
          );
      } catch (error) {
        console.error(
          "Artwork provider lookup failed:",
          error
        );

        return Response.json(
          {
            error:
              "Artwork lookup failed.",
          },
          {
            status: 502,
          }
        );
      }

      if (!imageUrl) {
        return Response.json({
          success: true,
          repaired: false,
          imageUrl:
            existingImageUrl || null,
          reason:
            "artwork-not-found",
        });
      }

      const repairedItems =
        items.map(
          (
            currentItem,
            index
          ) =>
            index === itemIndex
              ? {
                  ...currentItem,
                  imageUrl,
                }
              : currentItem
        );

      const {
        data: updatedCollection,
        error: updateError,
      } = await supabaseAdmin
        .from("collections")
        .update({
          items: repairedItems,
        })
        .eq("id", collectionId)
        .eq(
          "updated_at",
          collection.updated_at
        )
        .eq("status", "published")
        .is("removed_at", null)
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error(
          "Failed to persist artwork repair:",
          updateError
        );

        return Response.json(
          {
            error:
              "Failed to persist artwork repair.",
          },
          {
            status: 500,
          }
        );
      }

      if (!updatedCollection) {
        return Response.json(
          {
            error:
              "Collection changed before artwork repair could be saved.",
          },
          {
            status: 409,
          }
        );
      }

      return Response.json({
        success: true,
        repaired: true,
        imageUrl,
      });
    }
  ),
};
