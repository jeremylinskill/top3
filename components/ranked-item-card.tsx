import {
    CategoryId,
    TOP3_CATEGORIES,
} from '@/constants/top3-categories';
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
  const placeholderIcon =
  TOP3_CATEGORIES.find((categoryItem) => categoryItem.id === category)
    ?.placeholderIcon ?? 'image-outline';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.rankContainer}>
        <Text style={styles.rank}>{rank}</Text>
      </View>

      {item?.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.posterPlaceholder}>
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

      <View
        style={[
          styles.details,
          item && styles.detailsWithDragHandle,
        ]}>
        <Text style={styles.title} numberOfLines={2}>
          {item?.title ?? placeholder}
        </Text>

        {item ? (
          <Text style={styles.metadata} numberOfLines={2}>
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

  poster: {
    width: 56,
    height: 84,
    borderRadius: 8,
    marginLeft: 12,
  },

  posterPlaceholder: {
    width: 56,
    height: 84,
    marginLeft: 12,
    borderRadius: 8,
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
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