import { Top3Item } from '@/types/top3-item';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type RankedItemCardProps = {
  rank: number;
  item: Top3Item | null;
  placeholder: string;
  onPress: () => void;
};

export default function RankedItemCard({
  rank,
  item,
  placeholder,
  onPress,
}: RankedItemCardProps) {
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
          <Text style={styles.plus}>+</Text>
        </View>
      )}

      <View style={styles.details}>
        <Text style={styles.title}>
          {item?.title ?? placeholder}
        </Text>

        {item ? (
          <Text style={styles.metadata}>
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