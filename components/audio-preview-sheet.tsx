import IconButton from '@/components/icon-button';
import PreviewSaveButton from '@/components/preview-save-button';
import { useAudioPreview } from '@/context/audio-preview-context';
import { usePreviewSheetColors } from '@/hooks/use-preview-sheet-colors';
import { getMediaPreviewByline } from '@/lib/supabase/media-preview-byline';
import {
  getTop3ItemMetadata,
} from '@/utils/top3-item-metadata';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function isAppleMusicItemId(
  itemId: string
): boolean {
  return itemId.startsWith(
    'apple-music-'
  );
}

function isAppleMusicArtistItemId(
  itemId: string
): boolean {
  return itemId.startsWith(
    'apple-music-artist-'
  );
}

function isAppleMusicAlbumItemId(
  itemId: string
): boolean {
  return itemId.startsWith(
    'apple-music-album-'
  );
}

function isAppleMusicSongItemId(
  itemId: string
): boolean {
  return itemId.startsWith(
    'apple-music-song-'
  );
}

function isApplePodcastItemId(
  itemId: string
): boolean {
  return itemId.startsWith(
    'apple-podcast-'
  );
}

function formatTime(seconds: number): string {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return '0:00';
  }

  const wholeSeconds =
    Math.floor(seconds);

  const minutes =
    Math.floor(
      wholeSeconds / 60
    );

  const remainingSeconds =
    wholeSeconds % 60;

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
}

export default function AudioPreviewSheet() {
  const {
    activePreviewItem,
    activePreviewCategory,
    activeSaveContext,
    isPreviewVisible,
    isPreviewLoading,
    previewCurrentTime,
    previewDuration,
    previewProgress,
    stopPreview,
  } = useAudioPreview();

  const insets = useSafeAreaInsets();
  const previewColors =
    usePreviewSheetColors();

  const itemId =
    activePreviewItem?.id ?? '';

  const isAppleMusic =
    isAppleMusicItemId(itemId);

  const isApplePodcast =
    isApplePodcastItemId(itemId);

  const isAppleMusicArtist =
    isAppleMusicArtistItemId(
      itemId
    );

  const isAppleMusicAlbum =
    isAppleMusicAlbumItemId(
      itemId
    );

  const isAppleMusicSong =
    isAppleMusicSongItemId(
      itemId
    );

  const usesMusicBylineLayout =
    isAppleMusicArtist ||
    isAppleMusicAlbum ||
    isAppleMusicSong;

  const [
    musicPreviewByline,
    setMusicPreviewByline,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    setMusicPreviewByline(
      null
    );

    if (
      !isPreviewVisible ||
      !activePreviewItem ||
      !usesMusicBylineLayout
    ) {
      return () => {
        cancelled = true;
      };
    }

    const prefix =
      isAppleMusicArtist
        ? 'apple-music-artist-'
        : isAppleMusicAlbum
          ? 'apple-music-album-'
          : 'apple-music-song-';

    const appleMusicItemId =
      activePreviewItem.id
        .slice(prefix.length)
        .trim();

    if (!appleMusicItemId) {
      return () => {
        cancelled = true;
      };
    }

    const request =
      isAppleMusicArtist
        ? {
            entityKind:
              'artist' as const,
            appleMusicItemId,
            title:
              activePreviewItem.title,
            artistName:
              activePreviewItem.title,
            appleMusicArtistId:
              appleMusicItemId,
          }
        : isAppleMusicAlbum
          ? {
              entityKind:
                'album' as const,
              appleMusicItemId,
              title:
                activePreviewItem.title,
              artistName:
                activePreviewItem.subtitle,
              appleMusicArtistId:
                activePreviewItem.appleMusicArtistId,
              releaseYear:
                activePreviewItem.releaseYear,
            }
          : {
              entityKind:
                'song' as const,
              appleMusicItemId,
              title:
                activePreviewItem.title,
              artistName:
                activePreviewItem.subtitle,
              appleMusicArtistId:
                activePreviewItem.appleMusicArtistId,
              releaseYear:
                activePreviewItem.releaseYear,
              albumName:
                activePreviewItem.albumName,
            };

    void getMediaPreviewByline(
      request
    ).then((byline) => {
      if (!cancelled) {
        setMusicPreviewByline(
          byline
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    activePreviewItem,
    isAppleMusicAlbum,
    isAppleMusicArtist,
    isAppleMusicSong,
    isPreviewVisible,
    usesMusicBylineLayout,
  ]);

  const shouldShow =
    Boolean(
      activePreviewItem &&
        isPreviewVisible &&
        (
          isAppleMusic ||
          isApplePodcast
        )
    );

  if (
    !shouldShow ||
    !activePreviewItem
  ) {
    return null;
  }

  const previewItem =
    activePreviewItem;

  const previewMetadata =
    activePreviewCategory
      ? getTop3ItemMetadata(
          previewItem,
          activePreviewCategory
        )
      : previewItem.subtitle ?? '';

  const externalUrl =
    isApplePodcast
      ? previewItem.applePodcastsUrl
      : previewItem.appleMusicUrl;

  const externalLabel =
    isApplePodcast
      ? 'Apple Podcasts'
      : 'Apple Music';

  const placeholderIcon =
    isApplePodcast
      ? 'mic' as const
      : 'musical-note' as const;

  async function openExternalItem() {
    if (!externalUrl) {
      return;
    }

    const itemTitle =
      previewItem.title;

    try {
      await Linking.openURL(
        externalUrl
      );
    } catch (error) {
      if (__DEV__) {
        console.log(
          `Failed to open ${externalLabel} for ${itemTitle}:`,
          error
        );
      }
    }
  }

  const progressWidth =
    `${previewProgress * 100}%` as `${number}%`;

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.backdrop,
          {
            backgroundColor:
              previewColors.backdrop,
          },
        ]}
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.positioner,
        {
          bottom: Math.max(
            insets.bottom - 2,
            4
          ),
        },
      ]}>
      <View
        style={[
          styles.sheet,
          {
            backgroundColor:
              previewColors.surface,
            borderColor:
              previewColors.border,
          },
        ]}>
        <View style={styles.header}>
          <View
            style={
              styles.headerDetails
            }>
            <Text
              style={[
                styles.eyebrow,
                {
                  color:
                    previewColors.tertiaryText,
                },
              ]}
              numberOfLines={1}>
              PREVIEW PLAYING
            </Text>

            <Text
              style={[
                styles.title,
                {
                  color:
                    previewColors.primaryText,
                },
              ]}
              numberOfLines={1}>
              {
                activePreviewItem.title
              }
            </Text>

            {previewMetadata ? (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      previewColors.secondaryText,
                  },
                ]}
                numberOfLines={1}>
                {previewMetadata}
              </Text>
            ) : null}
          </View>

          <View style={styles.headerActions}>
            {activeSaveContext ? (
              <PreviewSaveButton
                item={activePreviewItem}
                saveContext={
                  activeSaveContext
                }
              />
            ) : null}

            <IconButton
              backgroundColor={
                previewColors.control
              }
              onPress={stopPreview}
              accessibilityLabel={`Close preview for ${activePreviewItem.title}`}>
              <Ionicons
                name="close"
                size={20}
                color={
                  previewColors.primaryText
                }
              />
            </IconButton>
          </View>
        </View>

        <View style={styles.mediaRow}>
          {activePreviewItem.imageUrl ? (
            <Image
              source={{
                uri:
                  activePreviewItem.imageUrl,
              }}
              style={[
                styles.artwork,
                {
                  backgroundColor:
                    previewColors.placeholder,
                },
              ]}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={[
                styles.artworkPlaceholder,
                {
                  backgroundColor:
                    previewColors.placeholder,
                },
              ]}>
              <Ionicons
                name={placeholderIcon}
                size={28}
                color={
                  previewColors.placeholderIcon
                }
              />
            </View>
          )}

          <View
            style={[
              styles.mediaDetails,
              !isApplePodcast &&
                styles.musicMediaDetails,
              usesMusicBylineLayout &&
                styles.musicBylineMediaDetails,
            ]}>
            {isApplePodcast ? (
              <View
                style={
                  styles.podcastDescriptionSlot
                }>
                {previewItem.podcastDescription ? (
                  <Text
                    style={[
                      styles.podcastDescription,
                      {
                        color:
                          previewColors.bodyText,
                      },
                    ]}
                    numberOfLines={4}
                    ellipsizeMode="tail">
                    {
                      previewItem.podcastDescription
                    }
                  </Text>
                ) : null}
              </View>
            ) : null}

            {usesMusicBylineLayout &&
            musicPreviewByline ? (
              <Text
                style={[
                  styles.musicByline,
                  {
                    color:
                      previewColors.bodyText,
                  },
                ]}
                numberOfLines={3}
                ellipsizeMode="tail">
                {musicPreviewByline}
              </Text>
            ) : null}

            {externalUrl ? (
              <Pressable
                style={({ pressed }) => [
                  styles.mediaLink,
                  usesMusicBylineLayout &&
                    styles.musicBylineMediaLink,
                  pressed &&
                    styles.linkPressed,
                ]}
                onPress={() => {
                  void openExternalItem();
                }}
                hitSlop={6}
                accessibilityRole="link"
                accessibilityLabel={`Open ${activePreviewItem.title} in ${externalLabel}`}>
                <Text
                  style={[
                    styles.linkText,
                    {
                      color:
                        previewColors.primaryText,
                    },
                  ]}>
                  {externalLabel} ↗
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View
          style={
            styles.progressSection
          }>
          {isApplePodcast &&
          isPreviewLoading ? (
            <View
              style={
                styles.loadingRow
              }>
              <ActivityIndicator
                size="small"
                color={
                  previewColors.tertiaryText
                }
              />
              <Text
                style={[
                  styles.loadingText,
                  {
                    color:
                      previewColors.tertiaryText,
                  },
                ]}>
                Preparing preview…
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor:
                      previewColors.control,
                  },
                ]}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round(
                    previewProgress * 100
                  ),
                }}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: progressWidth,
                      backgroundColor:
                        previewColors.primaryText,
                    },
                  ]}
                />
              </View>

              <View
                style={
                  styles.timeRow
                }>
                <Text
                  style={[
                    styles.timeText,
                    {
                      color:
                        previewColors.tertiaryText,
                    },
                  ]}>
                  {formatTime(
                    previewCurrentTime
                  )}
                </Text>

                <Text
                  style={[
                    styles.timeText,
                    {
                      color:
                        previewColors.tertiaryText,
                    },
                  ]}>
                  {formatTime(
                    previewDuration
                  )}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },

  positioner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
  },

  sheet: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.20,
    shadowRadius: 18,
    elevation: 12,
  },

  header: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  headerDetails: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  headerActions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },


  mediaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  artwork: {
    width: 88,
    height: 88,
    borderRadius: 6,
  },

  artworkPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mediaDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },

  musicMediaDetails: {
    minHeight: 88,
    justifyContent: 'flex-end',
  },

  musicBylineMediaDetails: {
    justifyContent: 'flex-start',
  },

  podcastDescriptionSlot: {
    height: 72,
    overflow: 'hidden',
  },

  podcastDescription: {
    fontSize: 13,
    lineHeight: 18,
  },

  musicByline: {
    fontSize: 13,
    lineHeight: 18,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 3,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
  },

  mediaLink: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    minHeight: 0,
    marginTop: 8,
    justifyContent: 'flex-start',
  },

  musicBylineMediaLink: {
    marginTop: 'auto',
  },

  linkText: {
    fontSize: 12,
    fontWeight: '600',
  },

  linkPressed: {
    opacity: 0.65,
  },

  progressSection: {
    marginTop: 12,
  },

  loadingRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    marginLeft: 8,
    fontSize: 11,
  },

  progressTrack: {
    width: '100%',
    height: 2,
    overflow: 'hidden',
    borderRadius: 1,
  },

  progressFill: {
    height: '100%',
    borderRadius: 1,
  },

  timeRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  timeText: {
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
});
