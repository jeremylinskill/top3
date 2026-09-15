import {
  registerAudioPreviewStopper,
  stopOtherMediaPreviewsFromCoordinator,
} from '@/lib/media-preview-coordinator';
import { getPodcastEpisodePreview } from '@/providers/podcasts';
import { Top3Item } from '@/types/top3-item';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type AudioPreviewContextValue = {
  activePreviewItem: Top3Item | null;
  activePreviewItemId: string | null;
  isPreviewPlaying: boolean;
  isPreviewVisible: boolean;
  previewCurrentTime: number;
  previewDuration: number;
  previewProgress: number;
  togglePreview: (item: Top3Item) => Promise<void>;
  stopPreview: () => void;
};

const AudioPreviewContext =
  createContext<AudioPreviewContextValue | undefined>(undefined);

type AudioPreviewProviderProps = {
  children: ReactNode;
};

const PODCAST_PREVIEW_START_SECONDS = 180;
const PODCAST_PREVIEW_DURATION_SECONDS = 45;

function isAppleMusicItem(item: Top3Item) {
  return item.id.startsWith('apple-music-');
}

function isApplePodcastItem(item: Top3Item) {
  return item.id.startsWith('apple-podcast-');
}

export function AudioPreviewProvider({
  children,
}: AudioPreviewProviderProps) {
  const [activePreviewItem, setActivePreviewItem] =
    useState<Top3Item | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] =
    useState(false);

  const previewPlayer = useAudioPlayer(null);
  const previewStatus = useAudioPlayerStatus(previewPlayer);
  const previewActionIdRef = useRef(0);

  const activePreviewItemId =
    activePreviewItem?.id ?? null;

  const isPodcastPreview =
    Boolean(
      activePreviewItem &&
        isApplePodcastItem(activePreviewItem)
    );

  const rawPreviewCurrentTime =
    Number.isFinite(previewStatus.currentTime)
      ? Math.max(previewStatus.currentTime, 0)
      : 0;

  const rawPreviewDuration =
    Number.isFinite(previewStatus.duration)
      ? Math.max(previewStatus.duration, 0)
      : 0;

  const podcastAvailableDuration =
    rawPreviewDuration >
    PODCAST_PREVIEW_START_SECONDS
      ? rawPreviewDuration -
        PODCAST_PREVIEW_START_SECONDS
      : 0;

  const previewDuration =
    isPodcastPreview
      ? podcastAvailableDuration > 0
        ? Math.min(
            podcastAvailableDuration,
            PODCAST_PREVIEW_DURATION_SECONDS
          )
        : PODCAST_PREVIEW_DURATION_SECONDS
      : rawPreviewDuration;

  const previewCurrentTime =
    isPodcastPreview
      ? Math.min(
          Math.max(
            rawPreviewCurrentTime -
              PODCAST_PREVIEW_START_SECONDS,
            0
          ),
          previewDuration
        )
      : rawPreviewCurrentTime;

  const previewProgress =
    previewDuration > 0
      ? Math.min(
          Math.max(
            previewCurrentTime / previewDuration,
            0
          ),
          1
        )
      : 0;

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    });
  }, []);

  useEffect(() => {
    if (
      previewStatus.didJustFinish &&
      activePreviewItem
    ) {
      previewActionIdRef.current += 1;
      setIsPreviewVisible(false);
      setActivePreviewItem(null);
    }
  }, [
    activePreviewItem,
    previewStatus.didJustFinish,
  ]);

  const stopPreview = useCallback(() => {
    previewActionIdRef.current += 1;
    previewPlayer.pause();
    setIsPreviewVisible(false);
    setActivePreviewItem(null);
  }, [previewPlayer]);

  useEffect(() => {
    if (
      !activePreviewItem ||
      !isApplePodcastItem(activePreviewItem) ||
      rawPreviewCurrentTime <
        PODCAST_PREVIEW_START_SECONDS +
          PODCAST_PREVIEW_DURATION_SECONDS
    ) {
      return;
    }

    stopPreview();
  }, [
    activePreviewItem,
    rawPreviewCurrentTime,
    stopPreview,
  ]);

  useEffect(() => {
    return registerAudioPreviewStopper(
      stopPreview
    );
  }, [stopPreview]);

  async function togglePreview(item: Top3Item) {
    if (
      isAppleMusicItem(item) &&
      !item.appleMusicUrl
    ) {
      if (activePreviewItem?.id === item.id) {
        stopPreview();
      }

      return;
    }

    const isCurrentPreview =
      activePreviewItem?.id === item.id;

    if (isCurrentPreview) {
      if (previewStatus.playing) {
        stopPreview();
        return;
      }

      const actionId =
        previewActionIdRef.current + 1;
      previewActionIdRef.current = actionId;

      stopOtherMediaPreviewsFromCoordinator(
        'audio'
      );

      if (
        previewStatus.didJustFinish ||
        (
          previewStatus.duration > 0 &&
          previewStatus.currentTime >=
            previewStatus.duration
        )
      ) {
        await previewPlayer.seekTo(0);

        if (
          previewActionIdRef.current !== actionId
        ) {
          return;
        }
      }

      setIsPreviewVisible(true);
      previewPlayer.play();
      return;
    }

    let playableItem = item;

    if (
      isApplePodcastItem(item) &&
      !item.previewUrl
    ) {
      const actionId =
        previewActionIdRef.current + 1;
      previewActionIdRef.current = actionId;

      stopOtherMediaPreviewsFromCoordinator(
        'audio'
      );

      previewPlayer.pause();

      try {
        const podcastPreview =
          await getPodcastEpisodePreview(item);

        if (
          previewActionIdRef.current !== actionId
        ) {
          return;
        }

        if (!podcastPreview) {
          return;
        }

        playableItem = {
          ...item,
          previewUrl:
            podcastPreview.audioUrl,
          applePodcastsUrl:
            item.applePodcastsUrl ??
            podcastPreview.applePodcastsUrl,
        };
      } catch (error) {
        if (
          previewActionIdRef.current !== actionId
        ) {
          return;
        }

        if (__DEV__) {
          console.log(
            `Failed to load podcast preview for ${item.title}:`,
            error
          );
        }

        return;
      }
    } else {
      if (!item.previewUrl) {
        return;
      }

      previewActionIdRef.current += 1;

      stopOtherMediaPreviewsFromCoordinator(
        'audio'
      );

      previewPlayer.pause();
    }

    if (!playableItem.previewUrl) {
      return;
    }

    previewPlayer.replace(
      playableItem.previewUrl
    );

    if (
      isApplePodcastItem(playableItem)
    ) {
      await previewPlayer.seekTo(
        PODCAST_PREVIEW_START_SECONDS
      );
    }

    setActivePreviewItem(
      playableItem
    );
    setIsPreviewVisible(true);

    previewPlayer.play();
  }

  return (
    <AudioPreviewContext.Provider
      value={{
        activePreviewItem,
        activePreviewItemId,
        isPreviewPlaying: previewStatus.playing,
        isPreviewVisible,
        previewCurrentTime,
        previewDuration,
        previewProgress,
        togglePreview,
        stopPreview,
      }}>
      {children}
    </AudioPreviewContext.Provider>
  );
}

export function useAudioPreview() {
  const context = useContext(AudioPreviewContext);

  if (!context) {
    throw new Error(
      'useAudioPreview must be used within an AudioPreviewProvider.'
    );
  }

  return context;
}
