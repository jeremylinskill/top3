import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { useAudioPreview } from '@/context/audio-preview-context';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
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
  } = useAudioPreview();

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

        {item?.previewUrl ? (
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
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.details,
          item && styles.detailsWithDragHandle,
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
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },

  rankContainer: {
    width: 32,
    alignItems: 'center',
  },

  rank: {
    fontSize: 24,
    fontWeight: '700',
  },

  artworkContainer: {
    position: 'relative',
    marginLeft: 12,
  },

  poster: {
    borderRadius: 8,
  },

  posterPlaceholder: {
    borderRadius: 8,
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 36,
    height: 36,
    marginTop: -18,
    marginLeft: -18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
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
    marginLeft: 16,
  },

  detailsWithDragHandle: {
    paddingRight: DRAG_HANDLE_WIDTH + 8,
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
  },

  metadata: {
    marginTop: 6,
    fontSize: 15,
    color: '#777777',
  },

  placeholderText: {
    marginTop: 6,
    fontSize: 15,
    color: '#999999',
  },
});