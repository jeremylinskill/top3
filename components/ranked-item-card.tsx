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

      </View>

      <View
        style={[
          styles.details,
          item &&
            !item.previewUrl &&
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
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginVertical: 4,
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
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
    color: '#222222',
  },

  metadata: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    color: '#888888',
  },

  placeholderText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    color: '#999999',
  },
});