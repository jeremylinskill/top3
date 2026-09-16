import { useAudioPreview } from '@/context/audio-preview-context';
import { usePreviewSheetColors } from '@/hooks/use-preview-sheet-colors';
import { Ionicons } from '@expo/vector-icons';
import {
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
  return (
    itemId.startsWith('apple-music-album-') ||
    itemId.startsWith('apple-music-artist-') ||
    itemId.startsWith('apple-music-song-')
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
}

export default function AppleMusicPreviewSheet() {
  const {
    activePreviewItem,
    isPreviewVisible,
    previewCurrentTime,
    previewDuration,
    previewProgress,
    stopPreview,
  } = useAudioPreview();

  const insets = useSafeAreaInsets();
  const previewColors =
    usePreviewSheetColors();

  const shouldShow =
    Boolean(
      activePreviewItem &&
        isPreviewVisible &&
        activePreviewItem.appleMusicUrl &&
        isAppleMusicItemId(activePreviewItem.id)
    );

  if (
    !shouldShow ||
    !activePreviewItem?.appleMusicUrl
  ) {
    return null;
  }

  async function openAppleMusic() {
    if (
      !activePreviewItem ||
      !activePreviewItem.appleMusicUrl
    ) {
      return;
    }

    const appleMusicUrl =
      activePreviewItem.appleMusicUrl;

    const itemTitle =
      activePreviewItem.title;

    try {
      await Linking.openURL(
        appleMusicUrl
      );
    } catch (error) {
      if (__DEV__) {
        console.log(
          `Failed to open Apple Music for ${itemTitle}:`,
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
          bottom: Math.max(insets.bottom - 2, 4),
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
          <View style={styles.headerDetails}>
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
              {activePreviewItem.title}
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
                {activePreviewItem.subtitle}
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

        <View style={styles.mediaRow}>
          {activePreviewItem.imageUrl ? (
            <Image
              source={{
                uri: activePreviewItem.imageUrl,
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
                name="musical-note"
                size={28}
                color={
                  previewColors.placeholderIcon
                }
              />
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.link,
              pressed && styles.linkPressed,
            ]}
            onPress={() => {
              void openAppleMusic();
            }}
            hitSlop={6}
            accessibilityRole="link"
            accessibilityLabel={`Open ${activePreviewItem.title} in Apple Music`}>
            <Text
              style={[
                styles.linkText,
                {
                  color:
                    previewColors.primaryText,
                },
              ]}>
              Apple Music ↗
            </Text>
          </Pressable>
        </View>

        <View style={styles.progressSection}>
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
              now: Math.round(previewProgress * 100),
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

          <View style={styles.timeRow}>
            <Text
              style={[
                styles.timeText,
                {
                  color:
                    previewColors.tertiaryText,
                },
              ]}>
              {formatTime(previewCurrentTime)}
            </Text>

            <Text
              style={[
                styles.timeText,
                {
                  color:
                    previewColors.tertiaryText,
                },
              ]}>
              {formatTime(previewDuration)}
            </Text>
          </View>
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
