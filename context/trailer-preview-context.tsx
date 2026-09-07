import { CategoryId } from '@/constants/top3-categories';
import {
    registerTrailerPreviewStopper,
    stopAudioPreviewFromCoordinator,
} from '@/lib/media-preview-coordinator';
import {
    getMovieTrailerUrl,
    getTvShowTrailerUrl,
} from '@/providers/movies-and-tv';
import { Top3Item } from '@/types/top3-item';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

type TrailerPreviewContextValue = {
  activeTrailerItem: Top3Item | null;
  activeTrailerEmbedUrl: string | null;
  isTrailerLoading: boolean;
  openTrailer: (
    item: Top3Item,
    category: CategoryId
  ) => Promise<boolean>;
  closeTrailer: () => void;
};

const TrailerPreviewContext =
  createContext<
    TrailerPreviewContextValue | undefined
  >(undefined);

type TrailerPreviewProviderProps = {
  children: ReactNode;
};

function getYouTubeEmbedUrlFromVideoId(
  videoId: string
): string | null {
  const trimmedVideoId = videoId.trim();

  if (!trimmedVideoId) {
    return null;
  }

  return (
    `https://www.youtube.com/embed/${trimmedVideoId}` +
    '?autoplay=1&playsinline=1&rel=0'
  );
}

function getYouTubeEmbedUrl(
  trailerUrl: string
): string | null {
  const videoIdMatch =
    /[?&]v=([^&]+)/.exec(trailerUrl);

  const encodedVideoId =
    videoIdMatch?.[1];

  if (!encodedVideoId) {
    return null;
  }

  let videoId = encodedVideoId;

  try {
    videoId =
      decodeURIComponent(encodedVideoId);
  } catch {
    // Keep the encoded ID if decoding fails.
  }

  return getYouTubeEmbedUrlFromVideoId(
    videoId
  );
}

export function TrailerPreviewProvider({
  children,
}: TrailerPreviewProviderProps) {
  const [
    activeTrailerItem,
    setActiveTrailerItem,
  ] = useState<Top3Item | null>(null);

  const [
    activeTrailerEmbedUrl,
    setActiveTrailerEmbedUrl,
  ] = useState<string | null>(null);

  const [
    isTrailerLoading,
    setIsTrailerLoading,
  ] = useState(false);

  const trailerRequestIdRef = useRef(0);

  const closeTrailer = useCallback(() => {
    trailerRequestIdRef.current += 1;
    setActiveTrailerItem(null);
    setActiveTrailerEmbedUrl(null);
    setIsTrailerLoading(false);
  }, []);

  useEffect(() => {
    return registerTrailerPreviewStopper(
      closeTrailer
    );
  }, [closeTrailer]);

  async function openTrailer(
    item: Top3Item,
    category: CategoryId
  ): Promise<boolean> {
    const requestId =
      trailerRequestIdRef.current + 1;
    trailerRequestIdRef.current = requestId;

    stopAudioPreviewFromCoordinator();
    setIsTrailerLoading(true);

    try {
      if (category === 'games') {
        if (!item.trailerVideoId) {
          return false;
        }

        const embedUrl =
          getYouTubeEmbedUrlFromVideoId(
            item.trailerVideoId
          );

        if (!embedUrl) {
          return false;
        }

        if (
          trailerRequestIdRef.current !== requestId
        ) {
          return false;
        }

        setActiveTrailerItem(item);
        setActiveTrailerEmbedUrl(embedUrl);

        return true;
      }

      const itemIdMatch =
        category === 'movies'
          ? /^movie-(\d+)$/.exec(item.id)
          : category === 'tv'
            ? /^tv-(\d+)$/.exec(item.id)
            : null;

      if (!itemIdMatch) {
        return false;
      }

      const itemId =
        Number(itemIdMatch[1]);

      if (!Number.isFinite(itemId)) {
        return false;
      }

      const trailerUrl =
        category === 'movies'
          ? await getMovieTrailerUrl(itemId)
          : await getTvShowTrailerUrl(itemId);

      if (
        trailerRequestIdRef.current !== requestId
      ) {
        return false;
      }

      if (!trailerUrl) {
        return false;
      }

      const embedUrl =
        getYouTubeEmbedUrl(trailerUrl);

      if (!embedUrl) {
        return false;
      }

      setActiveTrailerItem(item);
      setActiveTrailerEmbedUrl(embedUrl);

      return true;
    } catch (error) {
      if (
        trailerRequestIdRef.current === requestId &&
        __DEV__
      ) {
        console.log(
          `Failed to open trailer for ${item.title}:`,
          error
        );
      }

      return false;
    } finally {
      if (
        trailerRequestIdRef.current === requestId
      ) {
        setIsTrailerLoading(false);
      }
    }
  }

  return (
    <TrailerPreviewContext.Provider
      value={{
        activeTrailerItem,
        activeTrailerEmbedUrl,
        isTrailerLoading,
        openTrailer,
        closeTrailer,
      }}>
      {children}
    </TrailerPreviewContext.Provider>
  );
}

export function useTrailerPreview() {
  const context =
    useContext(TrailerPreviewContext);

  if (!context) {
    throw new Error(
      'useTrailerPreview must be used within a TrailerPreviewProvider.'
    );
  }

  return context;
}
