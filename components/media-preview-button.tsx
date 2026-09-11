import { CategoryId } from '@/constants/top3-categories';
import { useAudioPreview } from '@/context/audio-preview-context';
import { useBookPreview } from '@/context/book-preview-context';
import { useTrailerPreview } from '@/context/trailer-preview-context';
import {
    getBookDescription,
    getCachedBookDescription,
} from '@/providers/books';
import {
    getCachedTrailerAvailability,
    getMovieTrailerUrl,
    getTvShowTrailerUrl,
} from '@/providers/movies-and-tv';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Image,
    Pressable,
    StyleProp,
    StyleSheet,
    ViewStyle,
} from 'react-native';

type MediaPreviewKind =
  | 'audio'
  | 'book'
  | 'trailer'
  | null;

export type MediaPreviewController = {
  available: boolean;
  accessibilityLabel: string;
  disabled: boolean;
  iconName:
    | 'close'
    | 'information'
    | 'ellipsis-horizontal'
    | 'pause'
    | 'play';
  kind: MediaPreviewKind;
  onPress: () => Promise<void>;
};

type MediaPreviewOptions = {
  checkTrailerAvailability?: boolean;
};

type MediaPreviewButtonProps = {
  preview: MediaPreviewController;
  style?: StyleProp<ViewStyle>;
  onBeforePress?: () => void;
  iconSize?: number;
  iconColor?: string;
  offsetPlayIcon?: boolean;
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

function getBookVolumeId(
  item: Top3Item | null,
  category: string
): string | undefined {
  if (!item || category !== 'books') {
    return undefined;
  }

  const explicitVolumeId =
    item.googleBooksVolumeId?.trim();

  if (explicitVolumeId) {
    return explicitVolumeId;
  }

  const legacyItemId = item.id.trim();

  if (
    !legacyItemId ||
    legacyItemId.startsWith('curated-book-')
  ) {
    return undefined;
  }

  return legacyItemId;
}

export function useMediaPreview(
  item: Top3Item | null,
  category: string,
  options: MediaPreviewOptions = {}
): MediaPreviewController {
  const checkTrailerAvailability =
    options.checkTrailerAvailability ?? true;

  const {
    activePreviewItemId,
    isPreviewPlaying,
    togglePreview,
    stopPreview,
  } = useAudioPreview();

  const {
    activeBookItem,
    openBookPreview,
    closeBookPreview,
  } = useBookPreview();

  const {
    activeTrailerItem,
    openTrailer,
    closeTrailer,
  } = useTrailerPreview();

  const [
    isLoadingBook,
    setIsLoadingBook,
  ] = useState(false);

  const [
    bookAvailability,
    setBookAvailability,
  ] = useState<boolean | undefined>(
    undefined
  );

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

  const bookVolumeId =
    getBookVolumeId(
      item,
      category
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

  const canCheckBook =
    category === 'books' &&
    Boolean(bookVolumeId);

  const canDescribeBook =
    canCheckBook &&
    bookAvailability === true;

  const canCheckTrailer =
    category === 'games'
      ? Boolean(item?.trailerVideoId)
      : trailerItemId !== undefined;

  const canPlayTrailer =
    canCheckTrailer &&
    (
      !checkTrailerAvailability ||
      trailerAvailability === true
    );

  const hasAudioPreview =
    Boolean(item?.previewUrl);

  const kind: MediaPreviewKind =
    canPlayTrailer
      ? 'trailer'
      : hasAudioPreview
        ? 'audio'
        : canDescribeBook
          ? 'book'
          : null;

  const isCurrentAudioPreviewPlaying =
    Boolean(item) &&
    activePreviewItemId === item?.id &&
    isPreviewPlaying;

  const isCurrentBook =
    Boolean(item) &&
    activeBookItem?.id === item?.id;

  const isCurrentTrailer =
    Boolean(item) &&
    activeTrailerItem?.id === item?.id;

  const bookLoading =
    isLoadingBook;

  const trailerLoading =
    isLoadingTrailer;

  useEffect(() => {
    if (
      !item ||
      category !== 'books' ||
      !bookVolumeId
    ) {
      setBookAvailability(undefined);
      return;
    }

    const resolvedBookVolumeId =
      bookVolumeId;

    const cachedDescription =
      getCachedBookDescription(
        resolvedBookVolumeId
      );

    if (cachedDescription !== undefined) {
      setBookAvailability(
        Boolean(cachedDescription)
      );
      return;
    }

    setBookAvailability(undefined);

    let isMounted = true;
    const itemTitle = item.title;

    async function loadBookAvailability() {
      try {
        const description =
          await getBookDescription(
            resolvedBookVolumeId
          );

        if (isMounted) {
          setBookAvailability(
            Boolean(description)
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            `Failed to check book description availability for ${itemTitle}:`,
            error
          );
        }

        if (isMounted) {
          setBookAvailability(undefined);
        }
      }
    }

    void loadBookAvailability();

    return () => {
      isMounted = false;
    };
  }, [
    bookVolumeId,
    category,
    item?.id,
  ]);

  useEffect(() => {
    if (!item) {
      setTrailerAvailability(undefined);
      return;
    }

    if (!checkTrailerAvailability) {
      setTrailerAvailability(
        canCheckTrailer
          ? true
          : undefined
      );
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
    canCheckTrailer,
    category,
    checkTrailerAvailability,
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

    if (kind === 'book') {
      if (isCurrentBook) {
        closeBookPreview();
        return;
      }

      if (!bookVolumeId) {
        return;
      }

      setIsLoadingBook(true);

      try {
        const didOpen =
          await openBookPreview(item);

        setBookAvailability(
          didOpen
        );
      } finally {
        setIsLoadingBook(false);
      }

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
      : kind === 'book'
        ? isCurrentBook
          ? `Close details for ${item.title}`
          : `About ${item.title}`
        : kind === 'trailer'
          ? isCurrentTrailer
            ? `Close trailer for ${item.title}`
            : `Play trailer for ${item.title}`
          : isCurrentAudioPreviewPlaying
            ? `Pause preview of ${item.title}`
            : `Play preview of ${item.title}`;

  const iconName =
    kind === 'book'
      ? isCurrentBook
        ? 'close' as const
        : bookLoading
          ? 'ellipsis-horizontal' as const
          : 'information' as const
      : kind === 'trailer'
        ? isCurrentTrailer
          ? 'close' as const
          : trailerLoading
            ? 'ellipsis-horizontal' as const
            : 'play' as const
        : isCurrentAudioPreviewPlaying
          ? 'pause' as const
          : 'play' as const;

  const disabled =
    (
      kind === 'book' &&
      !isCurrentBook &&
      bookLoading
    ) ||
    (
      kind === 'trailer' &&
      !isCurrentTrailer &&
      trailerLoading
    );

  return {
    available: kind !== null,
    accessibilityLabel,
    disabled,
    iconName,
    kind,
    onPress: handlePress,
  };
}


const BOOK_PREVIEW_ICON = require(
  '../assets/images/book-preview-icon.png'
);

export default function MediaPreviewButton({
  preview,
  style,
  onBeforePress,
  iconSize = 17,
  iconColor = '#555555',
  offsetPlayIcon = true,
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
        onBeforePress?.();
        void preview.onPress();
      }}
      disabled={preview.disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={
        preview.accessibilityLabel
      }>
      {preview.kind === 'book' &&
      preview.iconName === 'information' ? (
        <Image
          source={BOOK_PREVIEW_ICON}
          style={[
            styles.bookPreviewIcon,
            {
              width: iconSize + 8,
              height: iconSize + 8,
            },
          ]}
          resizeMode="contain"
        />
      ) : (
        <Ionicons
          name={preview.iconName}
          size={iconSize}
          color={iconColor}
          style={
            preview.iconName === 'play' &&
            offsetPlayIcon
              ? styles.previewPlayIcon
              : undefined
          }
        />
      )}
    </Pressable>
  );
}

type MediaPreviewItemButtonProps = {
  item: Top3Item;
  category: string;
  style?: StyleProp<ViewStyle>;
  onBeforePress?: () => void;
  checkTrailerAvailability?: boolean;
  iconSize?: number;
  iconColor?: string;
  offsetPlayIcon?: boolean;
};

export function MediaPreviewItemButton({
  item,
  category,
  style,
  onBeforePress,
  checkTrailerAvailability,
  iconSize,
  iconColor,
  offsetPlayIcon,
}: MediaPreviewItemButtonProps) {
  const preview =
    useMediaPreview(
      item,
      category,
      {
        checkTrailerAvailability,
      }
    );

  return (
    <MediaPreviewButton
      preview={preview}
      style={style}
      onBeforePress={onBeforePress}
      iconSize={iconSize}
      iconColor={iconColor}
      offsetPlayIcon={offsetPlayIcon}
    />
  );
}

const styles = StyleSheet.create({
  bookPreviewIcon: {
    transform: [{ translateY: 0.5 }],
  },

  previewPlayIcon: {
    transform: [{ translateX: 1 }],
  },

  previewButtonPressed: {
    opacity: 0.75,
  },
});
