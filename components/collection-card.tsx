import { Top3List } from '@/types/top3-list';
import { StyleSheet, Text, View } from 'react-native';

type CollectionCardProps = {
  list: Top3List;
};

export default function CollectionCard({
  list,
}: CollectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{list.title}</Text>

      <View style={styles.items}>
        {list.items.map((item, index) => (
          <View
            key={index}
            style={styles.row}>
            <View style={styles.rankContainer}>
              <Text style={styles.rank}>
                {index + 1}
              </Text>
            </View>

            <Text
              style={[
                styles.itemTitle,
                !item && styles.placeholder,
              ]}
              numberOfLines={2}>
              {item?.title ?? '—'}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.brand}>
          Top 3
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222222',
  },

  items: {
    marginTop: 28,
    gap: 22,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  rankContainer: {
    width: 36,
    alignItems: 'center',
  },

  rank: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222222',
  },

  itemTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 22,
    lineHeight: 30,
    color: '#222222',
    fontWeight: '500',
  },

  placeholder: {
    color: '#BBBBBB',
    fontStyle: 'italic',
  },

  footer: {
    marginTop: 36,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
    alignItems: 'center',
  },

  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: '#444444',
    letterSpacing: 1,
  },
});