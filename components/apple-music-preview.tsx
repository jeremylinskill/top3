import { Top3Item } from '@/types/top3-item';
import {
    Linking,
    Pressable,
    StyleSheet,
    Text,
} from 'react-native';

type AppleMusicLinkProps = {
  item: Top3Item;
};

export function isAppleMusicItem(item: Top3Item): boolean {
  return (
    item.id.startsWith('apple-music-album-') ||
    item.id.startsWith('apple-music-artist-') ||
    item.id.startsWith('apple-music-song-')
  );
}

export function canPlayAppleMusicPreview(
  item: Top3Item
): boolean {
  return Boolean(
    isAppleMusicItem(item) &&
      item.previewUrl &&
      item.appleMusicUrl
  );
}

export default function AppleMusicLink({
  item,
}: AppleMusicLinkProps) {
  if (
    !isAppleMusicItem(item) ||
    !item.appleMusicUrl
  ) {
    return null;
  }

  async function openAppleMusic() {
    if (!item.appleMusicUrl) {
      return;
    }

    try {
      await Linking.openURL(item.appleMusicUrl);
    } catch (error) {
      if (__DEV__) {
        console.log(
          `Failed to open Apple Music for ${item.title}:`,
          error
        );
      }
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.link,
        pressed && styles.pressed,
      ]}
      onPress={(event) => {
        event.stopPropagation();
        void openAppleMusic();
      }}
      hitSlop={4}
      accessibilityRole="link"
      accessibilityLabel={`Open ${item.title} in Apple Music`}>
      <Text style={styles.linkText}>
        Open in Apple Music ↗
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'flex-start',
    marginTop: 5,
  },

  linkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
  },

  pressed: {
    opacity: 0.7,
  },
});