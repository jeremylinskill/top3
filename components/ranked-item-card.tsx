import AppText from '@/components/app-text';
import ArtworkThumbnail from '@/components/artwork-thumbnail';
import MediaPreviewButton, {
  useMediaPreview,
} from '@/components/media-preview-button';
import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import {
  CategoryId,
} from '@/constants/top3-categories';
import { useAppColors } from '@/hooks/use-app-colors';
import { Top3Item } from '@/types/top3-item';
import {
  getTop3ItemMetadata,
  usesGenreMetadataPresentation,
} from '@/utils/top3-item-metadata';
import {
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
const CARD_HORIZONTAL_PADDING = 16;
const RANK_COLUMN_WIDTH = 28;

export default function RankedItemCard({
  rank,
  item,
  placeholder,
  category,
  onPress,
}: RankedItemCardProps) {
  const colors = useAppColors();

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
        <ArtworkThumbnail
          imageUrl={item?.imageUrl}
          category={category}
          placeholderIcon={item ? undefined : 'add'}
          width={artworkRule.width}
          height={artworkRule.height}
          placeholderBackgroundColor={colors.border}
        />
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
            numberOfLines={
              String(item.id).startsWith('person-')
                ? 3
                : 2
            }>
            {getTop3ItemMetadata(
              item,
              category
            )}
            {!usesGenreMetadataPresentation(
              category
            ) &&
            typeof item.rating === 'number'
              ? ` · ★ ${item.rating.toFixed(1)}`
              : ''}
          </AppText>
        ) : (
          <AppText
            variant="subtitle"
            tone="tertiary"
            style={styles.placeholderText}>
            Tap to make a selection
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
    padding: CARD_HORIZONTAL_PADDING,
  },

  rankContainer: {
    // Covers the entire gap from the card edge to the artwork edge.
    // The negative margin preserves the artwork's existing position.
    width: CARD_HORIZONTAL_PADDING + RANK_COLUMN_WIDTH,
    marginLeft: -CARD_HORIZONTAL_PADDING,
    alignItems: 'center',
  },

  artworkContainer: {
    position: 'relative',
    marginRight: 13,
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
