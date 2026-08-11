import { Top3Item } from '@/types/top3-item';
import {
    setAudioModeAsync,
    useAudioPlayer,
    useAudioPlayerStatus,
} from 'expo-audio';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

type AudioPreviewContextValue = {
  activePreviewItemId: string | null;
  isPreviewPlaying: boolean;
  togglePreview: (
    item: Top3Item
  ) => Promise<void>;
  stopPreview: () => void;
};

const AudioPreviewContext =
  createContext<
    AudioPreviewContextValue | undefined
  >(undefined);

type AudioPreviewProviderProps = {
  children: ReactNode;
};

export function AudioPreviewProvider({
  children,
}: AudioPreviewProviderProps) {
  const [
    activePreviewItemId,
    setActivePreviewItemId,
  ] = useState<string | null>(null);

  const previewPlayer =
    useAudioPlayer(null);

  const previewStatus =
    useAudioPlayerStatus(
      previewPlayer
    );

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    });
  }, []);

  useEffect(() => {
    if (
      previewStatus.didJustFinish &&
      activePreviewItemId
    ) {
      setActivePreviewItemId(null);
    }
  }, [
    activePreviewItemId,
    previewStatus.didJustFinish,
  ]);

  async function togglePreview(
    item: Top3Item
  ) {
    if (!item.previewUrl) {
      return;
    }

    const isCurrentPreview =
      activePreviewItemId === item.id;

    if (isCurrentPreview) {
      if (previewStatus.playing) {
        previewPlayer.pause();
        return;
      }

      if (
        previewStatus.didJustFinish ||
        (
          previewStatus.duration > 0 &&
          previewStatus.currentTime >=
            previewStatus.duration
        )
      ) {
        await previewPlayer.seekTo(0);
      }

      previewPlayer.play();
      return;
    }

    previewPlayer.pause();

    previewPlayer.replace(
      item.previewUrl
    );

    setActivePreviewItemId(
      item.id
    );

    previewPlayer.play();
  }

  function stopPreview() {
    previewPlayer.pause();
    setActivePreviewItemId(null);
  }

  return (
    <AudioPreviewContext.Provider
      value={{
        activePreviewItemId,
        isPreviewPlaying:
          previewStatus.playing,
        togglePreview,
        stopPreview,
      }}>
      {children}
    </AudioPreviewContext.Provider>
  );
}

export function useAudioPreview() {
  const context =
    useContext(
      AudioPreviewContext
    );

  if (!context) {
    throw new Error(
      'useAudioPreview must be used within an AudioPreviewProvider.'
    );
  }

  return context;
}