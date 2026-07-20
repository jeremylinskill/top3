import RankedItemCard from '@/components/ranked-item-card';
import { useTop3 } from '@/context/top3-context';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CollectionScreen() {
  const { currentList } = useTop3();

  if (!currentList) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>No Collection Selected</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{currentList.title}</Text>

      <Text style={styles.subtitle}>
        Choose the three items that best represent your taste.
      </Text>

      <View style={styles.list}>
        {currentList.items.map((item, index) => (
          <RankedItemCard
            key={index}
            rank={index + 1}
            item={item}
            placeholder={`Choose item #${index + 1}`}
            onPress={() =>
              router.push({
                pathname: '/movie-search',
                params: { rank: String(index + 1) },
              })
            }
          />
        ))}
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