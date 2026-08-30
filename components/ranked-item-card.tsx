import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { TYPOGRAPHY } from '@/constants/typography';
import { useAudioPreview } from '@/context/audio-preview-context';
import {
  getCachedTrailerAvailability,
  getMovieTrailerUrl,
  getTvShowTrailerUrl,
} from '@/providers/movies-and-tv';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';


type RankedItemCardProps = {
  rank: number;
  item: Top3Item | null;
  placeholder: string;
  category: CategoryId;
  onPress: () => void;
};


const DRAG_HANDLE_WIDTH = 64;


function getYouTubeEmbedUrl(
  trailerUrl: string
): string | undefined {
  const videoIdMatch =
    /[?&]v=([^&]+)/.exec(trailerUrl);

  const encodedVideoId =
    videoIdMatch?.[1];

  if (!encodedVideoId) {
    return undefined;
  }

  let videoId = encodedVideoId;

  try {
    videoId =
      decodeURIComponent(encodedVideoId);
  } catch {
    // Keep the encoded ID if decoding fails.
  }

  return (
    `https://www.youtube.com/embed/${videoId}` +
    '?autoplay=1&playsinline=1&rel=0'
  );
}


function getYouTubeEmbedHtml(
  embedUrl: string
): string {
  return `
<!doctype html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000000;
      }

      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: #000000;
      }
    </style>
  </head>
  <body>
    <iframe
      src="${embedUrl}"
      title="Trailer"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  </body>
</html>
  `.trim();
}


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

  const [
    activeTrailerUrl,
    setActiveTrailerUrl,
  ] = useState<string | null>(null);

  const [
    activeTrailerTitle,
    setActiveTrailerTitle,
  ] = useState<string | null>(null);

  const [
    isTrailerLoaded,
    setIsTrailerLoaded,
  ] = useState(false);

  const trailerCloseOpacity =
    useRef(new Animated.Value(0)).current;


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
    Boolean(trailerItemIdMatch);

  const canPlayTrailer =
    canCheckTrailer &&
    trailerAvailability === true;



  const hasMediaButton =
    canPlayTrailer ||
    Boolean(item?.previewUrl);


  useEffect(() => {
    if (
      !item ||
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
          console.warn(
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
  ]);


  async function playTrailer() {
    if (
      !item ||
      !canCheckTrailer ||
      !trailerItemIdMatch
    ) {
      return;
    }

    const itemId =
      Number(trailerItemIdMatch[1]);

    if (!Number.isFinite(itemId)) {
      return;
    }

    setIsLoadingTrailer(true);

    try {
      const trailerUrl =
        category === 'movies'
          ? await getMovieTrailerUrl(
              itemId
            )
          : await getTvShowTrailerUrl(
              itemId
            );

      if (!trailerUrl) {
        setTrailerAvailability(false);
        return;
      }

      setTrailerAvailability(true);

      const embedUrl =
        getYouTubeEmbedUrl(
          trailerUrl
        );

      if (!embedUrl) {
        return;
      }

      stopPreview();
      setIsTrailerLoaded(false);
      trailerCloseOpacity.setValue(0);
      setActiveTrailerTitle(item.title);
      setActiveTrailerUrl(embedUrl);
    } catch (error) {
      if (__DEV__) {
        console.warn(
          `Failed to open trailer for ${item.title}:`,
          error
        );
      }
    } finally {
      setIsLoadingTrailer(false);
    }
  }


  function handleTrailerLoadEnd() {
    setIsTrailerLoaded(true);

    Animated.timing(
      trailerCloseOpacity,
      {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }
    ).start();
  }


  function closeTrailer() {
    setIsTrailerLoaded(false);
    trailerCloseOpacity.setValue(0);
    setActiveTrailerUrl(null);
    setActiveTrailerTitle(null);
  }


  return (
    <>
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
              void playTrailer();
            }}
            disabled={isLoadingTrailer}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={
              item
                ? `Play trailer for ${item.title}`
                : 'Play trailer'
            }>
            <Ionicons
              name={
                isLoadingTrailer
                  ? 'ellipsis-horizontal'
                  : 'play'
              }
              size={17}
              color="#555555"
              style={
                isLoadingTrailer
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


      <Modal
        visible={Boolean(activeTrailerUrl)}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closeTrailer}>
        <SafeAreaView
          style={styles.trailerModal}
          edges={['top', 'right', 'bottom', 'left']}>
          <View style={styles.trailerModalContent}>
            {activeTrailerUrl ? (
              <View style={styles.trailerPlayer}>
                {isTrailerLoaded ? (
                  <Animated.View
                    style={[
                      styles.trailerCloseButtonWrapper,
                      {
                        opacity:
                          trailerCloseOpacity,
                      },
                    ]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.trailerCloseButton,
                        pressed &&
                          styles.trailerCloseButtonPressed,
                      ]}
                      onPress={closeTrailer}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={
                        activeTrailerTitle
                          ? `Close trailer for ${activeTrailerTitle}`
                          : 'Close trailer'
                      }>
                      <Ionicons
                        name="close"
                        size={20}
                        color="rgba(255, 255, 255, 0.88)"
                      />
                    </Pressable>
                  </Animated.View>
                ) : null}

                <WebView
                  source={{
                    html:
                      getYouTubeEmbedHtml(
                        activeTrailerUrl
                      ),
                    baseUrl:
                      'https://com.jeremylinskillsteam.top3',
                  }}
                  style={styles.trailerWebView}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsFullscreenVideo
                  onLoadEnd={handleTrailerLoadEnd}
                />
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
    </>
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


  trailerModal: {
    flex: 1,
    backgroundColor: '#000000',
  },


  trailerModalContent: {
    flex: 1,
    justifyContent: 'center',
  },


  trailerPlayer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },


  trailerWebView: {
    flex: 1,
    backgroundColor: '#000000',
  },


  trailerCloseButtonWrapper: {
    position: 'absolute',
    top: -52,
    right: 18,
    zIndex: 2,
  },


  trailerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },


  trailerCloseButtonPressed: {
    opacity: 0.7,
  },
});