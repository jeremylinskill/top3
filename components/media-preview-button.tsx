import { CategoryId } from '@/constants/top3-categories';
import { useAudioPreview } from '@/context/audio-preview-context';
import { useTrailerPreview } from '@/context/trailer-preview-context';
import {
    getCachedTrailerAvailability,
    getMovieTrailerUrl,
    getTvShowTrailerUrl,
} from '@/providers/movies-and-tv';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Pressable,
    StyleProp,
    StyleSheet,
    ViewStyle,
} from 'react-native';

type MediaPreviewKind =
  | 'audio'
  | 'trailer'
  | null;

export type MediaPreviewController = {
  available: boolean;
  accessibilityLabel: string;
  disabled: boolean;
  iconName:
    | 'close'
    | 'ellipsis-horizontal'
    | 'pause'
    | 'play';
  kind: MediaPreviewKind;
  onPress: () => Promise<void>;
};

type MediaPreviewButtonProps = {
  preview: MediaPreviewController;
  style?: StyleProp<ViewStyle>;
};

function getTrailerItemId(
  item: Top3Item | null,
  category: string
): number | undefined {
  if (!item) {
    return undefined;
  }

  const itemIdMatch =
    category === 'movies'
      ? /^movie-(\d+)$/.exec(item.id)
      : category === 'tv'
        ? /^tv-(\d+)$/.exec(item.id)
        : null;

  if (!itemIdMatch) {
    return undefined;
  }

  const numericItemId =
    Number(itemIdMatch[1]);

  return Number.isFinite(numericItemId)
    ? numericItemId
    : undefined;
}

export function useMediaPreview(
  item: Top3Item | null,
  category: string
): MediaPreviewController {
  const {
    activePreviewItemId,
    isPreviewPlaying,
    togglePreview,
    stopPreview,
  } = useAudioPreview();

  const {
    activeTrailerItem,
    openTrailer,
    closeTrailer,
    isTrailerLoading,
  } = useTrailerPreview();

  const [
    isLoadingTrailer,
    setIsLoadingTrailer,
  ] = useState(false);

  const [
    trailerAvailability,
    setTrailerAvailability,
  ] = useState<boolean | undefined>(
    undefined
  );

  const trailerItemId =
    getTrailerItemId(
      item,
      category
    );

  const trailerCategory: CategoryId | null =
    category === 'movies' ||
    category === 'tv' ||
    category === 'games'
      ? category
      : null;

  const canCheckTrailer =
    category === 'games'
      ? Boolean(item?.trailerVideoId)
      : trailerItemId !== undefined;

  const canPlayTrailer =
    canCheckTrailer &&
    trailerAvailability === true;

  const hasAudioPreview =
    Boolean(item?.previewUrl);

  const kind: MediaPreviewKind =
    canPlayTrailer
      ? 'trailer'
      : hasAudioPreview
        ? 'audio'
        : null;

  const isCurrentAudioPreviewPlaying =
    Boolean(item) &&
    activePreviewItemId === item?.id &&
    isPreviewPlaying;

  const isCurrentTrailer =
    Boolean(item) &&
    activeTrailerItem?.id === item?.id;

  const trailerLoading =
    isLoadingTrailer ||
    isTrailerLoading;

  useEffect(() => {
    if (!item) {
      setTrailerAvailability(undefined);
      return;
    }

    if (category === 'games') {
      setTrailerAvailability(
        Boolean(item.trailerVideoId)
      );
      return;
    }

    if (
      trailerItemId === undefined ||
      (
        category !== 'movies' &&
        category !== 'tv'
      )
    ) {
      setTrailerAvailability(undefined);
      return;
    }

    const resolvedTrailerItemId =
      trailerItemId;

    const cachedAvailability =
      getCachedTrailerAvailability(
        category,
        resolvedTrailerItemId
      );

    if (cachedAvailability !== undefined) {
      setTrailerAvailability(
        cachedAvailability
      );
      return;
    }

    let isMounted = true;
    const itemTitle = item.title;

    async function loadTrailerAvailability() {
      try {
        const trailerUrl =
          category === 'movies'
            ? await getMovieTrailerUrl(
                resolvedTrailerItemId
              )
            : await getTvShowTrailerUrl(
                resolvedTrailerItemId
              );

        if (isMounted) {
          setTrailerAvailability(
            Boolean(trailerUrl)
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            `Failed to check trailer availability for ${itemTitle}:`,
            error
          );
        }

        if (isMounted) {
          setTrailerAvailability(
            undefined
          );
        }
      }
    }

    void loadTrailerAvailability();

    return () => {
      isMounted = false;
    };
  }, [
    category,
    item?.id,
    item?.trailerVideoId,
    trailerItemId,
  ]);

  async function handlePress() {
    if (!item || !kind) {
      return;
    }

    if (kind === 'audio') {
      await togglePreview(item);
      return;
    }

    if (isCurrentTrailer) {
      closeTrailer();
      return;
    }

    if (
      !canCheckTrailer ||
      !trailerCategory
    ) {
      return;
    }

    setIsLoadingTrailer(true);

    try {
      stopPreview();

      const didOpen =
        await openTrailer(
          item,
          trailerCategory
        );

      setTrailerAvailability(
        didOpen
      );
    } finally {
      setIsLoadingTrailer(false);
    }
  }

  const accessibilityLabel =
    !item
      ? 'Media preview'
      : kind === 'trailer'
        ? isCurrentTrailer
          ? `Close trailer for ${item.title}`
          : `Play trailer for ${item.title}`
        : isCurrentAudioPreviewPlaying
          ? `Pause preview of ${item.title}`
          : `Play preview of ${item.title}`;

  const iconName =
    kind === 'trailer'
      ? isCurrentTrailer
        ? 'close' as const
        : trailerLoading
          ? 'ellipsis-horizontal' as const
          : 'play' as const
      : isCurrentAudioPreviewPlaying
        ? 'pause' as const
        : 'play' as const;

  const disabled =
    kind === 'trailer' &&
    !isCurrentTrailer &&
    trailerLoading;

  return {
    available: kind !== null,
    accessibilityLabel,
    disabled,
    iconName,
    kind,
    onPress: handlePress,
  };
}

export default function MediaPreviewButton({
  preview,
  style,
}: MediaPreviewButtonProps) {
  if (!preview.available) {
    return null;
  }

  return (
    <Pressable
      style={({ pressed }) => [
        style,
        pressed &&
          styles.previewButtonPressed,
      ]}
      onPress={(event) => {
        event.stopPropagation();
        void preview.onPress();
      }}
      disabled={preview.disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={
        preview.accessibilityLabel
      }>
      <Ionicons
        name={preview.iconName}
        size={17}
        color="#555555"
        style={
          preview.iconName === 'play'
            ? styles.previewPlayIcon
            : undefined
        }
      />
    </Pressable>
  );
}


type MediaPreviewItemButtonProps = {
  item: Top3Item;
  category: string;
  style?: StyleProp<ViewStyle>;
};

export function MediaPreviewItemButton({
  item,
  category,
  style,
}: MediaPreviewItemButtonProps) {
  const preview =
    useMediaPreview(
      item,
      category
    );

  return (
    <MediaPreviewButton
      preview={preview}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  previewPlayIcon: {
    transform: [{ translateX: 1 }],
  },

  previewButtonPressed: {
    opacity: 0.75,
  },
});
