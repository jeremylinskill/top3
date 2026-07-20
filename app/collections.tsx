import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CollectionsScreen() {
  const { lists, selectList } = useTop3();

  function getCollectionIcon(categoryId: string, topic?: string) {
    const category = TOP3_CATEGORIES.find(
      (item) => item.id === categoryId
    );

    if (!category) {
      return '⭐';
    }

    if (!topic) {
      return category.icon;
    }

    const topicConfig = category.topics.find(
      (item) => item.name.toLowerCase() === topic.toLowerCase()
    );

    return topicConfig?.icon ?? category.icon;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Collections</Text>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {lists.map((list) => {
          const selectedCount = list.items.filter(Boolean).length;
          const isComplete = selectedCount === 3;
          const icon = getCollectionIcon(list.category, list.topic);

          return (
            <Pressable
              key={list.id}
              style={styles.collectionCard}
              onPress={() => {
                selectList(list.id);
                router.push('/collection');
              }}>
              <Text style={styles.icon}>{icon}</Text>

              <View style={styles.collectionDetails}>
                <View style={styles.titleRow}>
                  <Text style={styles.collectionTitle}>{list.title}</Text>

                  {isComplete ? (
                    <Text style={styles.completeIndicator}>✓</Text>
                  ) : null}
                </View>

                <Text style={styles.collectionSubtitle}>
                  {selectedCount}/3 selected
                </Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </Pressable>
          );
        })}

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
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  icon: {
    fontSize: 28,
    marginRight: 14,
  },
  collectionDetails: {
    flex: 1,
    paddingRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collectionTitle: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  completeIndicator: {
    fontSize: 18,
    fontWeight: '700',
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