import { useAudioPreview } from '@/context/audio-preview-context';
import { Ionicons } from '@expo/vector-icons';
import {
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
    <View
      pointerEvents="box-none"
      style={[
        styles.positioner,
        {
          bottom: Math.max(insets.bottom - 2, 4),
        },
      ]}>
      <View style={styles.sheet}>
        <View style={styles.contentRow}>
          <View style={styles.details}>
            <Text
              style={styles.eyebrow}
              numberOfLines={1}>
              PREVIEW PLAYING
            </Text>

            <Text
              style={styles.title}
              numberOfLines={1}>
              {activePreviewItem.title}
            </Text>

            {activePreviewItem.subtitle ? (
              <Text
                style={styles.subtitle}
                numberOfLines={1}>
                {activePreviewItem.subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.actions}>
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
              <Text style={styles.linkText}>
                Apple Music ↗
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.pauseButton,
                pressed && styles.pauseButtonPressed,
              ]}
              onPress={stopPreview}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Stop preview for ${activePreviewItem.title}`}>
              <Ionicons
                name="pause"
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View
            style={styles.progressTrack}
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
                },
              ]}
            />
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {formatTime(previewCurrentTime)}
            </Text>

            <Text style={styles.timeText}>
              {formatTime(previewDuration)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
  },

  sheet: {
    minHeight: 72,
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
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

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  details: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  actions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#B8B8B8',
    marginBottom: 3,
  },

  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#D0D0D0',
  },

  link: {
    flexShrink: 0,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  linkPressed: {
    opacity: 0.65,
  },

  pauseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
  },

  pauseButtonPressed: {
    opacity: 0.65,
  },

  progressSection: {
    marginTop: 10,
  },

  progressTrack: {
    width: '100%',
    height: 2,
    overflow: 'hidden',
    borderRadius: 1,
    backgroundColor: '#2A2A2A',
  },

  progressFill: {
    height: '100%',
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },

  timeRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  timeText: {
    fontSize: 9,
    color: '#B8B8B8',
    fontVariant: ['tabular-nums'],
  },
});
