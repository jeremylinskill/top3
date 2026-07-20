import RankedItemCard from '@/components/ranked-item-card';
import { useTop3 } from '@/context/top3-context';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MoviesScreen() {
  const { currentList } = useTop3();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
  {currentList?.title ?? 'Top 3'}
</Text>

      <Text style={styles.subtitle}>
        Choose the three movies that best represent your taste.
      </Text>

      <View style={styles.list}>
        <RankedItemCard
          rank={1}
          item={currentList.items[0]}
          placeholder="Choose your #1 movie"
          onPress={() =>
            router.push({
              pathname: '/movie-search',
              params: { rank: '1' },
            })
          }
        />

        <RankedItemCard
          rank={2}
          item={currentList.items[1]}
          placeholder="Choose your #2 movie"
          onPress={() =>
            router.push({
              pathname: '/movie-search',
              params: { rank: '2' },
            })
          }
        />

        <RankedItemCard
          rank={3}
          item={currentList.items[2]}
          placeholder="Choose your #3 movie"
          onPress={() =>
            router.push({
              pathname: '/movie-search',
              params: { rank: '3' },
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  title: {
    fontSize: 34,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: 17,
    color: '#666666',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 24,
  },

  list: {
    gap: 12,
  },
});