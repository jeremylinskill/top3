import { useAudioPreview } from '@/context/audio-preview-context';
import { usePreviewSheetColors } from '@/hooks/use-preview-sheet-colors';
import { Ionicons } from '@expo/vector-icons';
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

            {activePreviewItem.subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      previewColors.secondaryText,
                  },
                ]}
                numberOfLines={1}>
                {
                  activePreviewItem.subtitle
                }
              </Text>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor:
                  previewColors.control,
              },
              pressed &&
                styles.closeButtonPressed,
            ]}
            onPress={stopPreview}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Close preview for ${activePreviewItem.title}`}>
            <Ionicons
              name="close"
              size={20}
              color={
                previewColors.primaryText
              }
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.mediaRow,
            isApplePodcast &&
              styles.podcastMediaRow,
          ]}>
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

          {isApplePodcast ? (
            <View
              style={
                styles.podcastDetails
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

              {externalUrl ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.link,
                    styles.podcastLink,
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
          ) : externalUrl ? (
            <Pressable
              style={({ pressed }) => [
                styles.link,
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

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonPressed: {
    opacity: 0.65,
  },

  mediaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  podcastMediaRow: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
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

  podcastDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },

  podcastDescription: {
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

  link: {
    flexShrink: 0,
    minHeight: 36,
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },

  podcastLink: {
    alignSelf: 'flex-start',
    minHeight: 0,
    marginTop: 8,
    paddingHorizontal: 0,
    justifyContent: 'flex-start',
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
