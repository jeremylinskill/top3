import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { TYPOGRAPHY } from '@/constants/typography';
import { useAudioPreview } from '@/context/audio-preview-context';
import { useTrailerPreview } from '@/context/trailer-preview-context';
import {
  getCachedTrailerAvailability,
  getMovieTrailerUrl,
  getTvShowTrailerUrl,
} from '@/providers/movies-and-tv';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import {
  useEffect,
  useState,
} from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';


type RankedItemCardProps = {
  rank: number;
  item: Top3Item | null;
  placeholder: string;
  category: CategoryId;
  onPress: () => void;
};


const DRAG_HANDLE_WIDTH = 64;


export default function RankedItemCard({
  rank,
  item,
  placeholder,
  category,
  onPress,
}: RankedItemCardProps) {
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

  const placeholderIcon =
    TOP3_CATEGORIES.find(
      (categoryItem) =>
        categoryItem.id === category
    )?.placeholderIcon ?? 'image-outline';


  const artworkRule =
    getCategoryArtworkRule(category);


  const isCurrentPreviewPlaying =
    Boolean(item) &&
    activePreviewItemId === item?.id &&
    isPreviewPlaying;


  const trailerItemIdMatch =
    item &&
    (
      category === 'movies'
        ? /^movie-(\d+)$/.exec(item.id)
        : category === 'tv'
          ? /^tv-(\d+)$/.exec(item.id)
          : null
    );

  const canCheckTrailer =
    category === 'games'
      ? Boolean(item?.trailerVideoId)
      : Boolean(trailerItemIdMatch);

  const canPlayTrailer =
    canCheckTrailer &&
    trailerAvailability === true;



  const hasMediaButton =
    canPlayTrailer ||
    Boolean(item?.previewUrl);


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
      !trailerItemIdMatch ||
      (
        category !== 'movies' &&
        category !== 'tv'
      )
    ) {
      setTrailerAvailability(undefined);
      return;
    }

    const itemId =
      Number(trailerItemIdMatch[1]);

    if (!Number.isFinite(itemId)) {
      setTrailerAvailability(false);
      return;
    }

    const cachedAvailability =
      getCachedTrailerAvailability(
        category,
        itemId
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
            ? await getMovieTrailerUrl(itemId)
            : await getTvShowTrailerUrl(itemId);

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
          setTrailerAvailability(undefined);
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
  ]);


  async function playTrailer() {
    if (!item || !canCheckTrailer) {
      return;
    }

    setIsLoadingTrailer(true);

    try {
      stopPreview();

      const didOpen =
        await openTrailer(
          item,
          category
        );

      setTrailerAvailability(didOpen);
    } finally {
      setIsLoadingTrailer(false);
    }
  }


  return (
    <Pressable
        style={styles.card}
        onPress={onPress}>
        <View style={styles.rankContainer}>
          <Text style={styles.rank}>
            {rank}
          </Text>
        </View>


        <View
          style={[
            styles.artworkContainer,
            {
              width: artworkRule.width,
              height: artworkRule.height,
            },
          ]}>
          {item?.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={[
                styles.poster,
                {
                  width: artworkRule.width,
                  height: artworkRule.height,
                },
              ]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.posterPlaceholder,
                {
                  width: artworkRule.width,
                  height: artworkRule.height,
                },
              ]}>
              {item ? (
                <Ionicons
                  name={placeholderIcon}
                  size={28}
                  color="#999999"
                />
              ) : (
                <Text style={styles.plus}>+</Text>
              )}
            </View>
          )}
        </View>


        <View
          style={[
            styles.details,
            item &&
              !hasMediaButton &&
              styles.detailsWithDragHandle,
          ]}>
          <Text
            style={styles.title}
            numberOfLines={2}>
            {item?.title ?? placeholder}
          </Text>


          {item ? (
            <Text
              style={styles.metadata}
              numberOfLines={2}>
              {item.subtitle ?? ''}
              {typeof item.rating === 'number'
                ? ` · ★ ${item.rating.toFixed(1)}`
                : ''}
            </Text>
          ) : (
            <Text style={styles.placeholderText}>
              Tap to choose
            </Text>
          )}
        </View>


        {canPlayTrailer ? (
          <Pressable
            style={({ pressed }) => [
              styles.previewButton,
              pressed &&
                styles.previewButtonPressed,
            ]}
            onPress={(event) => {
              event.stopPropagation();

              if (
                item &&
                activeTrailerItem?.id === item.id
              ) {
                closeTrailer();
                return;
              }

              void playTrailer();
            }}
            disabled={
              activeTrailerItem?.id !== item?.id &&
              (isLoadingTrailer || isTrailerLoading)
            }
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={
              item
                ? activeTrailerItem?.id === item.id
                  ? `Close trailer for ${item.title}`
                  : `Play trailer for ${item.title}`
                : 'Play trailer'
            }>
            <Ionicons
              name={
                item &&
                activeTrailerItem?.id === item.id
                  ? 'close'
                  : isLoadingTrailer || isTrailerLoading
                    ? 'ellipsis-horizontal'
                    : 'play'
              }
              size={17}
              color="#555555"
              style={
                item &&
                activeTrailerItem?.id === item.id
                  ? undefined
                  : isLoadingTrailer || isTrailerLoading
                    ? undefined
                    : styles.previewPlayIcon
              }
            />
          </Pressable>
        ) : item?.previewUrl ? (
          <Pressable
            style={({ pressed }) => [
              styles.previewButton,
              pressed &&
                styles.previewButtonPressed,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              void togglePreview(item);
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={
              isCurrentPreviewPlaying
                ? `Pause preview of ${item.title}`
                : `Play preview of ${item.title}`
            }>
            <Ionicons
              name={
                isCurrentPreviewPlaying
                  ? 'pause'
                  : 'play'
              }
              size={17}
              color="#555555"
              style={
                isCurrentPreviewPlaying
                  ? undefined
                  : styles.previewPlayIcon
              }
            />
          </Pressable>
        ) : null}
      </Pressable>


  );
}


const styles = StyleSheet.create({
  card: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  borderWidth: 1,
  borderColor: '#EEEEEE',
},


  rankContainer: {
    width: 28,
    alignItems: 'center',
    transform: [{ translateX: -5 }],
  },


  rank: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },


  artworkContainer: {
    position: 'relative',
    marginRight: 13,
  },


  poster: {
    borderRadius: 9,
    backgroundColor: '#EEEEEE',
  },


  posterPlaceholder: {
    borderRadius: 9,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },


  previewButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    marginLeft: 10,
    marginRight: DRAG_HANDLE_WIDTH + 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },


  previewPlayIcon: {
    transform: [{ translateX: 1 }],
  },


  previewButtonPressed: {
    opacity: 0.75,
  },


  plus: {
    fontSize: 28,
    color: '#999999',
  },


  details: {
    flex: 1,
    minWidth: 0,
  },


  detailsWithDragHandle: {
    paddingRight: DRAG_HANDLE_WIDTH + 8,
  },


  title: {
    ...TYPOGRAPHY.cardTitle,
  },


  metadata: {
    ...TYPOGRAPHY.subtitle,
    marginTop: 4,
  },


  placeholderText: {
    ...TYPOGRAPHY.subtitle,
    marginTop: 4,
    color: '#999999',
  },


});