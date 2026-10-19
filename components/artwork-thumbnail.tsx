import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

type ArtworkThumbnailProps = {
  imageUrl?: string | null;
  category?: string;
  width: number;
  height: number;
  placeholderIcon?: keyof typeof Ionicons.glyphMap;
  placeholderBackgroundColor?: string;
  placeholderColor?: string;
  borderRadius?: number;
  onImageError?: () => void;
};

/** Consistent artwork and a category-aware fallback for missing/broken images. */
export default function ArtworkThumbnail({
  imageUrl,
  category,
  width,
  height,
  placeholderIcon,
  placeholderBackgroundColor,
  placeholderColor,
  borderRadius = 9,
  onImageError,
}: ArtworkThumbnailProps) {
  const colors = useAppColors();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const url = imageUrl?.trim() || null;
  // A changed URL can be attempted without resetting state in an effect.
  const showImage = Boolean(url && failedUrl !== url);
  const resolvedIcon =
    placeholderIcon ??
    TOP3_CATEGORIES.find((item) => item.id === category)?.placeholderIcon ??
    'image-outline';
  const iconSize = Math.min(29, Math.round(Math.min(width, height) * 0.44));
  const wellSize = Math.min(46, Math.min(width, height) - 10);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: placeholderBackgroundColor ?? colors.skeletonSubtle,
        },
      ]}>
      {showImage && url ? (
        <Image
          source={{ uri: url }}
          style={styles.image}
          resizeMode="cover"
          onError={() => {
            setFailedUrl(url);
            onImageError?.();
          }}
        />
      ) : (
        <View style={styles.placeholder}>
          <View
            style={[
              styles.iconWell,
              {
                width: wellSize,
                height: wellSize,
                borderRadius: Math.min(14, wellSize / 3),
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Ionicons
              name={resolvedIcon}
              size={iconSize}
              color={placeholderColor ?? colors.tertiaryText}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWell: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
