import { useTop3 } from '@/context/top3-context';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CollectionsScreen() {
  const { lists, selectList } = useTop3();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Collections</Text>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {lists.map((list) => (
          <Pressable
            key={list.id}
            style={styles.collectionCard}
            onPress={() => {
              selectList(list.id);
              router.push('/movies');
            }}>
            <View style={styles.collectionDetails}>
              <Text style={styles.collectionTitle}>{list.title}</Text>

              <Text style={styles.collectionSubtitle}>
                {list.topic ? `${list.topic} · ` : ''}
                Tap to edit
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}

        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/create-collection')}>
          <Text style={styles.createButtonText}>＋ Create Collection</Text>
        </Pressable>
      </ScrollView>
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
    marginBottom: 24,
  },
  list: {
    gap: 12,
    paddingBottom: 32,
  },
  collectionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  collectionDetails: {
    flex: 1,
    paddingRight: 12,
  },
  collectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  collectionSubtitle: {
    fontSize: 15,
    color: '#777777',
    marginTop: 6,
  },
  arrow: {
    fontSize: 32,
    color: '#999999',
  },
  createButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});