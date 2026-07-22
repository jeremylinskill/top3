import ScreenHeader from '@/components/screen-header';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { router } from 'expo-router';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CollectionsScreen() {
  const { lists, selectList } = useTop3();

  function getCategory(categoryId: string) {
    return TOP3_CATEGORIES.find(
      (category) => category.id === categoryId
    );
  }

  function getCollectionIcon(categoryId: string, topic?: string) {
    const category = getCategory(categoryId);

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

  function getDisplayTitle(categoryId: string, topic?: string) {
    const category = getCategory(categoryId);
    const categoryName = category?.name ?? categoryId;

    if (!topic) {
      return categoryName;
    }

    return `${categoryName} · ${topic}`;
  }

  const sortedLists = [...lists].sort((firstList, secondList) => {
    const firstCategoryName =
      getCategory(firstList.category)?.name ?? firstList.category;

    const secondCategoryName =
      getCategory(secondList.category)?.name ?? secondList.category;

    const categoryComparison = firstCategoryName.localeCompare(
      secondCategoryName
    );

    if (categoryComparison !== 0) {
      return categoryComparison;
    }

    const firstIsGeneral = !firstList.topic;
    const secondIsGeneral = !secondList.topic;

    if (firstIsGeneral && !secondIsGeneral) {
      return -1;
    }

    if (!firstIsGeneral && secondIsGeneral) {
      return 1;
    }

    return (firstList.topic ?? '').localeCompare(
      secondList.topic ?? ''
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="My Top 3" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {sortedLists.map((list) => {
          const selectedCount = list.items.filter(Boolean).length;
          const isComplete = selectedCount === 3;
          const icon = getCollectionIcon(
            list.category,
            list.topic
          );

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
                <Text style={styles.collectionTitle}>
                  {getDisplayTitle(list.category, list.topic)}
                </Text>

                {!isComplete ? (
                  <Text style={styles.collectionSubtitle}>
                    {selectedCount} of 3 selected
                  </Text>
                ) : null}
              </View>

              <Text style={styles.arrow}>›</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/create-collection')}>
          <Text style={styles.createButtonText}>
            ＋ Create Collection
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },

  scrollView: {
    flex: 1,
  },

  list: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
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

  collectionTitle: {
    flexShrink: 1,
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

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
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