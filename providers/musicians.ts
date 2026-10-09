import { VERIFIED_MUSICIAN_BANDS } from '@/constants/musician-band-associations';
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
    imageUrl:
      musician.imageUrlOverride?.trim() ||
      undefined,
    bylineOverride:
      musician.bylineOverride?.trim() ||
      undefined,
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
        .flatMap((musician) => [
          musician.appleMusicArtistId,
          musician.previewArtistIdOverride,
          VERIFIED_MUSICIAN_BANDS[musician.id]
            ?.appleMusicArtistId,
        ])
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
        appleMusicArtistIds,
        true
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
          musician.appleMusicArtistId?.trim();

        const band =
          VERIFIED_MUSICIAN_BANDS[musician.id];

        const soloArtist = artistId
          ? enrichmentByArtistId.get(artistId)
          : undefined;

        const bandArtist = band
          ? enrichmentByArtistId.get(
              band.appleMusicArtistId
            )
          : undefined;

        const overrideArtist =
          musician.previewArtistIdOverride?.trim()
            ? enrichmentByArtistId.get(
                musician.previewArtistIdOverride.trim()
              )
            : undefined;

        if (!soloArtist && !bandArtist && !overrideArtist) {
          return baseItem;
        }

        const previewArtist =
          overrideArtist?.previewUrl
            ? overrideArtist
            : bandArtist?.previewUrl
              ? bandArtist
              : soloArtist;

        return {
          ...baseItem,
          subtitle:
            soloArtist?.subtitle ??
            overrideArtist?.subtitle ??
            bandArtist?.subtitle,
          imageUrl:
            musician.imageUrlOverride?.trim() ||
            soloArtist?.imageUrl,
          appleMusicUrl:
            soloArtist?.appleMusicUrl ??
            previewArtist?.appleMusicUrl ??
            bandArtist?.appleMusicUrl,
          appleMusicArtistId: soloArtist
            ? artistId
            : undefined,
          previewUrl: previewArtist?.previewUrl,
          previewSongId: previewArtist?.previewSongId,
          previewSongTitle: previewArtist?.previewSongTitle,
          previewRecordingArtist:
            previewArtist?.previewRecordingArtist,
          previewRecordingGenre: previewArtist?.subtitle,
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
