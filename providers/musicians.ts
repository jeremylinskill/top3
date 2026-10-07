import {
  getPopularMusiciansByRole,
  MusicianRole,
  MusicianSearchResult,
  searchMusiciansByRole,
} from '@/lib/supabase/musicians';
import {
  enrichAppleMusicArtistsByIds,
} from '@/lib/supabase/apple-music';
import { Top3Item } from '@/types/top3-item';

function mapMusicianToTop3Item(
  musician: MusicianSearchResult
): Top3Item {
  return {
    id: musician.id,
    title: musician.name,
  };
}

function getAppleMusicArtistId(
  item: Top3Item
): string | undefined {
  const match =
    item.id.match(
      /^apple-music-artist-([0-9]+)$/
    );

  return match?.[1];
}

async function mapMusiciansToTop3Items(
  musicians: MusicianSearchResult[]
): Promise<Top3Item[]> {
  const baseItems =
    musicians.map(
      mapMusicianToTop3Item
    );

  const appleMusicArtistIds = [
    ...new Set(
      musicians
        .map(
          (musician) =>
            musician.appleMusicArtistId
        )
        .filter(
          (
            artistId
          ): artistId is string =>
            Boolean(
              artistId?.trim()
            )
        )
    ),
  ];

  if (
    appleMusicArtistIds.length === 0
  ) {
    return baseItems;
  }

  try {
    const enrichments =
      await enrichAppleMusicArtistsByIds(
        appleMusicArtistIds
      );

    const enrichmentByArtistId =
      new Map(
        enrichments
          .map((item) => {
            const artistId =
              getAppleMusicArtistId(
                item
              );

            return artistId
              ? [artistId, item] as const
              : null;
          })
          .filter(
            (
              entry
            ): entry is readonly [
              string,
              Top3Item,
            ] =>
              entry !== null
          )
      );

    return musicians.map(
      (musician) => {
        const baseItem =
          mapMusicianToTop3Item(
            musician
          );

        const artistId =
          musician
            .appleMusicArtistId
            ?.trim();

        if (!artistId) {
          return baseItem;
        }

        const enrichment =
          enrichmentByArtistId.get(
            artistId
          );

        if (!enrichment) {
          return baseItem;
        }

        return {
          ...baseItem,
          subtitle:
            enrichment.subtitle,
          imageUrl:
            enrichment.imageUrl,
          appleMusicUrl:
            enrichment.appleMusicUrl,
        };
      }
    );
  } catch (error) {
    if (__DEV__) {
      console.log(
        'Musician Apple Music enrichment failed; using catalogue results:',
        error
      );
    }

    return baseItems;
  }
}

export async function searchMusicians(
  query: string,
  role: MusicianRole,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  const musicians =
    await searchMusiciansByRole(
      role,
      query,
      20
    );

  return mapMusiciansToTop3Items(
    musicians
  );
}

export async function getPopularMusicians(
  role: MusicianRole,
  limit = 20,
  _signal?: AbortSignal
): Promise<Top3Item[]> {
  const musicians =
    await getPopularMusiciansByRole(
      role,
      limit
    );

  return mapMusiciansToTop3Items(
    musicians
  );
}
