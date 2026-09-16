import AppText from '@/components/app-text';
import MediaPreviewButton, {
  useMediaPreview,
} from '@/components/media-preview-button';
import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { useAppColors } from '@/hooks/use-app-colors';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  Pressable,
  StyleSheet,
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
  const colors = useAppColors();

  const placeholderIcon =
    TOP3_CATEGORIES.find(
      (categoryItem) =>
        categoryItem.id === category
    )?.placeholderIcon ?? 'image-outline';

  const artworkRule =
    getCategoryArtworkRule(category);

  const mediaPreview =
    useMediaPreview(
      item,
      category
    );

  const hasMediaButton =
    mediaPreview.available;

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}>
      <View style={styles.rankContainer}>
        <AppText
          variant="headline"
          tone="primary">
          {rank}
        </AppText>
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
                backgroundColor: colors.border,
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
                backgroundColor: colors.border,
              },
            ]}>
            {item ? (
              <Ionicons
                name={placeholderIcon}
                size={28}
                color={colors.tertiaryText}
              />
            ) : (
              <Ionicons
                name="add"
                size={28}
                color={colors.tertiaryText}
              />
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
        <AppText
          variant="cardTitle"
          tone="primary"
          numberOfLines={2}>
          {item?.title ?? placeholder}
        </AppText>

        {item ? (
          <AppText
            variant="subtitle"
            tone="tertiary"
            style={styles.metadata}
            numberOfLines={2}>
            {item.subtitle ?? ''}
            {typeof item.rating === 'number'
              ? ` · ★ ${item.rating.toFixed(1)}`
              : ''}
          </AppText>
        ) : (
          <AppText
            variant="subtitle"
            tone="tertiary"
            style={styles.placeholderText}>
            Tap to choose
          </AppText>
        )}
      </View>

      {item ? (
        <MediaPreviewButton
          preview={mediaPreview}
          style={[
            styles.previewButton,
            {
              backgroundColor:
                colors.background,
            },
          ]}
          iconColor={colors.secondaryText}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },

  rankContainer: {
    width: 28,
    alignItems: 'center',
    transform: [{ translateX: -5 }],
  },

  artworkContainer: {
    position: 'relative',
    marginRight: 13,
  },

  poster: {
    borderRadius: 9,
  },

  posterPlaceholder: {
    borderRadius: 9,
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
  },

  details: {
    flex: 1,
    minWidth: 0,
  },

  detailsWithDragHandle: {
    paddingRight: DRAG_HANDLE_WIDTH + 8,
  },

  metadata: {
    marginTop: 4,
  },

  placeholderText: {
    marginTop: 4,
  },
});
